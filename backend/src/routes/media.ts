import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import {
  createMediaErrorResponse,
  internalError,
  invalidCommand,
  invalidTrackId,
  isMediaApiError,
} from "../media/errors.js";
import type { HomeAssistantBridgePublisher } from "../homeassistant/mediaBridge.js";
import {
  buildFallbackTrackCoverSvg,
  findSidecarCoverPath,
  getTrackCoverContentType,
} from "../media/trackCovers.js";
import {
  isMediaCommand,
  type InMemoryMediaService,
} from "../media/service.js";
import type {
  MediaCommandResponse,
  MediaErrorResponse,
  MediaLibraryRescanResponse,
} from "../media/types.js";

function sendMediaError(
  reply: {
    code(statusCode: number): {
      send(payload: MediaErrorResponse): unknown;
    };
  },
  error: unknown,
  fallbackMessage: string,
) {
  if (isMediaApiError(error)) {
    return reply
      .code(error.statusCode)
      .send(createMediaErrorResponse(error.code, error.message));
  }

  const safeError = internalError(fallbackMessage);
  return reply
    .code(safeError.statusCode)
    .send(createMediaErrorResponse(safeError.code, safeError.message));
}

export function registerMediaRoutes(
  app: FastifyInstance,
  mediaService: InMemoryMediaService,
  homeAssistantBridge: HomeAssistantBridgePublisher,
) {
  function publishMirrorUpdate() {
    void homeAssistantBridge
      .publishMediaUpdate(mediaService.getState(), mediaService.getLatestLogEntry())
      .catch((error) => {
        mediaService.recordRuntimeEvent(
          "haBridge.publish_failed",
          error instanceof Error ? error.message : String(error),
          {
            level: "warn",
            domain: "haBridge",
          },
        );
        app.log.warn({ err: error }, "Failed to publish HA media mirror update");
      });
  }

  app.get("/api/media/state", async () => {
    return mediaService.getState();
  });

  app.get("/api/library/tracks", async () => {
    return mediaService.getTracks();
  });

  app.get("/api/library/tracks/:trackId/cover", async (request, reply) => {
    const trackId = Number.parseInt(
      (request.params as { trackId?: string }).trackId ?? "",
      10,
    );

    if (!Number.isInteger(trackId)) {
      const error = invalidTrackId();
      return reply
        .code(error.statusCode)
        .send(createMediaErrorResponse(error.code, error.message));
    }

    try {
      const trackFilePath = mediaService.getTrackStreamPath(trackId);
      const track = mediaService.getTracks().find((entry) => entry.id === trackId);

      if (track) {
        const sidecarCoverPath = findSidecarCoverPath(trackFilePath);

        if (sidecarCoverPath) {
          reply.header("Content-Type", getTrackCoverContentType(sidecarCoverPath));
          return reply.send(fs.createReadStream(sidecarCoverPath));
        }

        reply.header("Content-Type", "image/svg+xml; charset=utf-8");
        return reply.send(buildFallbackTrackCoverSvg(track));
      }

      const error = invalidTrackId();
      return reply
        .code(error.statusCode)
        .send(createMediaErrorResponse(error.code, error.message));
    } catch (error) {
      return sendMediaError(
        reply,
        error,
        "Track cover is not available.",
      );
    }
  });

  app.get("/api/library/tracks/:trackId/stream", async (request, reply) => {
    const trackId = Number.parseInt(
      (request.params as { trackId?: string }).trackId ?? "",
      10,
    );

    if (!Number.isInteger(trackId)) {
      const error = invalidTrackId();
      return reply
        .code(error.statusCode)
        .send(createMediaErrorResponse(error.code, error.message));
    }

    try {
      const filePath = mediaService.getTrackStreamPath(trackId);

      reply.header("Content-Type", "audio/mpeg");
      return reply.send(fs.createReadStream(filePath));
    } catch (error) {
      return sendMediaError(
        reply,
        error,
        "Track stream is not available.",
      );
    }
  });

  app.get("/api/library/playlists", async () => {
    return mediaService.getPlaylists();
  });

  app.get("/api/logs/recent", async () => {
    return mediaService.getRecentLogs();
  });

  app.post("/api/library/rescan", async (_, reply) => {
    try {
      const summary = mediaService.rescanLibrary();
      publishMirrorUpdate();

      const response: MediaLibraryRescanResponse = {
        ok: true,
        ...summary,
      };

      return response;
    } catch (error) {
      return sendMediaError(reply, error, "Failed to rescan media library.");
    }
  });

  app.post("/api/media/command", async (request, reply) => {
    if (!isMediaCommand(request.body)) {
      const error = invalidCommand();
      return reply
        .code(error.statusCode)
        .send(createMediaErrorResponse(error.code, error.message));
    }

    try {
      const mediaState = mediaService.applyCommand(request.body);
      publishMirrorUpdate();
      const response: MediaCommandResponse = {
        ok: true,
        media: mediaState,
      };

      return response;
    } catch (error) {
      app.log.warn({ err: error }, "Failed to apply media command");

      return sendMediaError(reply, error, "Failed to apply media command.");
    }
  });
}
