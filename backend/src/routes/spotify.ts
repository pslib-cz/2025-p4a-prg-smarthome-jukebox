import type { FastifyInstance, FastifyReply } from "fastify";
import type { HomeAssistantBridgePublisher } from "../homeassistant/mediaBridge.js";
import type { InMemoryMediaService } from "../media/service.js";
import {
  createSpotifyErrorResponse,
  isSpotifyApiError,
  spotifyInternalError,
} from "../spotify/errors.js";
import type { SpotifyService, SpotifyTransferRequestBody } from "../spotify/types.js";

function sendSpotifyError(reply: FastifyReply, error: unknown, fallbackMessage: string) {
  if (isSpotifyApiError(error)) {
    return reply
      .code(error.statusCode)
      .send(createSpotifyErrorResponse(error.code, error.message));
  }

  const safeError = spotifyInternalError(fallbackMessage);
  return reply
    .code(safeError.statusCode)
    .send(createSpotifyErrorResponse(safeError.code, safeError.message));
}

function appendVaryHeader(reply: FastifyReply, value: string) {
  const current = reply.getHeader("Vary");

  if (!current) {
    reply.header("Vary", value);
    return;
  }

  const values = String(current)
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);

  if (!values.includes(value)) {
    values.push(value);
  }

  reply.header("Vary", values.join(", "));
}

function applySpotifyResponseHeaders(reply: FastifyReply) {
  reply.header("Cache-Control", "no-store");
  reply.header("Pragma", "no-cache");
  appendVaryHeader(reply, "Cookie");
}

export function registerSpotifyRoutes(
  app: FastifyInstance,
  spotifyService: SpotifyService,
  mediaService: InMemoryMediaService,
  homeAssistantBridge: HomeAssistantBridgePublisher,
) {
  async function publishSpotifyMirrorUpdate(
    request: Parameters<SpotifyService["getSessionSummary"]>[0],
    event?:
      | {
          action: string;
          message: string;
        }
      | undefined,
  ) {
    try {
      if (!homeAssistantBridge.getHealthSnapshot().configured) {
        return;
      }

      if (event) {
        mediaService.recordRuntimeEvent(event.action, event.message, {
          domain: "system",
        });
      }

      const [session, playback] = await Promise.all([
        spotifyService.getSessionSummary(request),
        spotifyService.getPlaybackState(request),
      ]);

      await homeAssistantBridge.publishMediaUpdate(
        mediaService.getState(),
        event ? mediaService.getLatestLogEntry() : null,
        {
          session,
          playback,
        },
      );
    } catch (error) {
      mediaService.recordRuntimeEvent(
        "haBridge.spotify_publish_failed",
        error instanceof Error ? error.message : String(error),
        {
          level: "warn",
          domain: "haBridge",
        },
      );
      app.log.warn({ err: error }, "Failed to publish HA Spotify mirror update");
    }
  }

  app.get("/auth/spotify/login", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      return await spotifyService.startLogin(request, reply);
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to start Spotify login.");
    }
  });

  app.get("/auth/spotify/callback", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      await spotifyService.handleCallback(request, reply);
      const query = (request.query ?? {}) as {
        error?: string;
      };

      await publishSpotifyMirrorUpdate(
        request,
        query.error
          ? {
              action: "spotify.callback_error",
              message: `Spotify callback returned ${query.error}.`,
            }
          : {
              action: "spotify.connected",
              message: "Spotify session connected.",
            },
      );
      return reply;
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to handle Spotify callback.");
    }
  });

  app.get("/api/spotify/session", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      return await spotifyService.getSessionSummary(request);
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to read Spotify session.");
    }
  });

  app.get("/api/spotify/token", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      return await spotifyService.getAccessTokenPayload(request);
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to read Spotify access token.");
    }
  });

  app.get("/api/spotify/state", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      return await spotifyService.getPlaybackState(request);
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to read Spotify playback state.");
    }
  });

  app.post("/api/spotify/transfer", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      const playback = await spotifyService.transferPlayback(
        request,
        (request.body ?? {}) as SpotifyTransferRequestBody,
      );
      await publishSpotifyMirrorUpdate(request, {
        action: "spotify.transfer",
        message: `Spotify playback transferred to ${playback.deviceName ?? "browser player"}.`,
      });
      return playback;
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to transfer Spotify playback.");
    }
  });

  app.post("/api/spotify/disconnect", async (request, reply) => {
    applySpotifyResponseHeaders(reply);

    try {
      const result = await spotifyService.disconnect(request, reply);
      await publishSpotifyMirrorUpdate(request, {
        action: "spotify.disconnected",
        message: "Spotify session disconnected.",
      });
      return result;
    } catch (error) {
      return sendSpotifyError(reply, error, "Failed to disconnect Spotify session.");
    }
  });
}
