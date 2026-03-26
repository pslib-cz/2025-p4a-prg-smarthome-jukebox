import fs from "node:fs";
import type { FastifyInstance } from "fastify";
import {
  isMediaCommand,
  type InMemoryMediaService,
} from "../media/service.js";

export function registerMediaRoutes(
  app: FastifyInstance,
  mediaService: InMemoryMediaService,
) {
  app.get("/api/media/state", async () => {
    return mediaService.getState();
  });

  app.get("/api/library/tracks", async () => {
    return mediaService.getTracks();
  });

  app.get("/api/library/tracks/:trackId/stream", async (request, reply) => {
    const trackId = Number.parseInt(
      (request.params as { trackId?: string }).trackId ?? "",
      10,
    );

    if (!Number.isInteger(trackId)) {
      return reply.code(400).send({
        error: "Invalid track id.",
      });
    }

    try {
      const filePath = mediaService.getTrackStreamPath(trackId);

      reply.header("Content-Type", "audio/mpeg");
      return reply.send(fs.createReadStream(filePath));
    } catch (error) {
      return reply.code(404).send({
        error:
          error instanceof Error
            ? error.message
            : "Track stream is not available.",
      });
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

      return {
        ok: true,
        ...summary,
      };
    } catch (error) {
      return reply.code(400).send({
        error:
          error instanceof Error
            ? error.message
            : "Failed to rescan media library.",
      });
    }
  });

  app.post("/api/media/command", async (request, reply) => {
    if (!isMediaCommand(request.body)) {
      return reply.code(400).send({
        error: "Invalid media command payload.",
      });
    }

    try {
      const mediaState = mediaService.applyCommand(request.body);

      return {
        ok: true,
        media: mediaState,
      };
    } catch (error) {
      app.log.warn({ err: error }, "Failed to apply media command");

      return reply.code(400).send({
        error:
          error instanceof Error
            ? error.message
            : "Failed to apply media command.",
      });
    }
  });
}
