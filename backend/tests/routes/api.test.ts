import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { HomeAssistantBridgePublisher } from "../../src/homeassistant/mediaBridge.js";
import type {
  MediaLogEntry,
  MediaStateSnapshot,
} from "../../src/media/types.js";
import type { BackendHomeAssistantBridgeHealthSnapshot } from "../../src/runtime/types.js";

let app: FastifyInstance | null = null;
let tempDir: string | null = null;

function createHomeAssistantBridgeSpy() {
  const startupSnapshots: MediaStateSnapshot[] = [];
  const updates: Array<{
    mediaState: MediaStateSnapshot;
    event: MediaLogEntry | null;
  }> = [];

  const publisher: HomeAssistantBridgePublisher = {
    async publishStartup(mediaState) {
      startupSnapshots.push(mediaState);
    },
    async publishMediaUpdate(mediaState, event) {
      updates.push({
        mediaState,
        event: event ?? null,
      });
    },
    getHealthSnapshot() {
      return {
        status: "ready",
        reason: null,
        lastChangedAt: "2026-04-13T20:00:00.000Z",
        configured: true,
        brokerUrl: "mqtt://127.0.0.1:1883",
        topicPrefix: "jukebox",
        lastSuccessfulPublishAt: "2026-04-13T20:00:00.000Z",
      };
    },
    async close() {},
  };

  return {
    publisher,
    startupSnapshots,
    updates,
  };
}

function createRejectingHomeAssistantBridgePublisher(): HomeAssistantBridgePublisher {
  return {
    async publishStartup() {},
    async publishMediaUpdate() {
      throw new Error("Synthetic HA bridge publish failure.");
    },
    getHealthSnapshot() {
      return {
        status: "degraded",
        reason: "Synthetic HA bridge publish failure.",
        lastChangedAt: "2026-04-13T20:00:00.000Z",
        configured: true,
        brokerUrl: "mqtt://127.0.0.1:1883",
        topicPrefix: "jukebox",
        lastSuccessfulPublishAt: null,
      };
    },
    async close() {},
  };
}

function createHealthOnlyBridgePublisher(
  healthSnapshot: BackendHomeAssistantBridgeHealthSnapshot,
): HomeAssistantBridgePublisher {
  return {
    async publishStartup() {},
    async publishMediaUpdate() {},
    getHealthSnapshot() {
      return healthSnapshot;
    },
    async close() {},
  };
}

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }

  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("backend API", () => {
  it(
    "publishes a startup mirror snapshot when the app becomes ready",
    async () => {
    const bridgeSpy = createHomeAssistantBridgeSpy();
    app = buildApp({ logger: false }, null, bridgeSpy.publisher);

    await app.inject({
      method: "GET",
      url: "/api/health",
    });

    expect(bridgeSpy.startupSnapshots).toHaveLength(1);
    expect(bridgeSpy.startupSnapshots[0].sourceLabel).toBe("Local MP3");
    },
    15_000,
  );

  it("returns a health payload", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.service).toBe("hajukebox-backend");
    expect(body.dependencies.mediaLibrary.status).toBe("ready");
    expect(body.dependencies.mediaLibrary.trackCount).toBeGreaterThan(0);
    expect(body.dependencies.haBridge.status).toBe("disabled");
    expect(body.dependencies.haBridge.reason).toBe("Home Assistant MQTT bridge is not configured.");
    expect(body.dependencies.spotify.status).toBe("disabled");
    expect(body.dependencies.spotify.reason).toBe("Spotify web playback is not configured.");
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns an ok health payload when baseline dependencies are ready", async () => {
    app = buildApp(
      { logger: false },
      null,
      createHealthOnlyBridgePublisher({
        status: "ready",
        reason: null,
        lastChangedAt: "2026-04-13T20:00:00.000Z",
        configured: true,
        brokerUrl: "mqtt://127.0.0.1:1883",
        topicPrefix: "jukebox",
        lastSuccessfulPublishAt: "2026-04-13T20:00:00.000Z",
      }),
      {
        clientId: "spotify-client-id",
        redirectUri: "http://127.0.0.1:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/spotify/return",
        scopes: ["streaming", "user-read-private"],
        mockMode: null,
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.dependencies.haBridge.status).toBe("ready");
    expect(body.dependencies.mediaLibrary.status).toBe("ready");
    expect(body.dependencies.spotify.status).toBe("ready");
    expect(body.dependencies.spotify.configured).toBe(true);
  });

  it("returns a degraded health payload when the HA bridge is unhealthy", async () => {
    app = buildApp({ logger: false }, null, createRejectingHomeAssistantBridgePublisher());

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("degraded");
    expect(body.dependencies.haBridge.status).toBe("degraded");
    expect(body.dependencies.haBridge.reason).toBe("Synthetic HA bridge publish failure.");
  });

  it("surfaces a degraded spotify dependency when redirect configuration is invalid", async () => {
    app = buildApp(
      { logger: false },
      null,
      createHealthOnlyBridgePublisher({
        status: "ready",
        reason: null,
        lastChangedAt: "2026-04-13T20:00:00.000Z",
        configured: true,
        brokerUrl: "mqtt://127.0.0.1:1883",
        topicPrefix: "jukebox",
        lastSuccessfulPublishAt: "2026-04-13T20:00:00.000Z",
      }),
      {
        clientId: "spotify-client-id",
        redirectUri: "http://localhost:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/spotify/return",
        scopes: ["streaming"],
        mockMode: null,
      },
    );

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.dependencies.spotify.status).toBe("degraded");
    expect(body.dependencies.spotify.reason).toContain(
      "HAJUKEBOX_SPOTIFY_REDIRECT_URI must use 127.0.0.1 instead of localhost",
    );
  });

  it("returns a normalized local media state contract", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/media/state",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.source).toBe("local");
    expect(body.sourceLabel).toBe("Local MP3");
    expect(body.activeTrack.title).toBe("Midnight Groove");
    expect(body.audio.codec).toBe("MP3");
    expect(body.availability.overall).toBe("ready");
    expect(body.availability.library.status).toBe("ready");
    expect(body.capabilities.play).toBe(true);
    expect(body.capabilities.seek).toBe(true);
  });

  it("returns a non-empty local track list", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0].id).toBe(1);
  });

  it("applies a play command and updates media state", async () => {
    const bridgeSpy = createHomeAssistantBridgeSpy();
    app = buildApp({ logger: false }, null, bridgeSpy.publisher);

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.media.isPlaying).toBe(true);
    expect(bridgeSpy.updates).toHaveLength(1);
    expect(bridgeSpy.updates[0].mediaState.isPlaying).toBe(true);
    expect(bridgeSpy.updates[0].event?.action).toBe("media.play");
  });

  it("keeps media commands successful when the HA mirror publish fails", async () => {
    app = buildApp(
      { logger: false },
      null,
      createRejectingHomeAssistantBridgePublisher(),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.media.isPlaying).toBe(true);
  });

  it("records a structured runtime log when the HA mirror publish fails", async () => {
    app = buildApp(
      { logger: false },
      null,
      createRejectingHomeAssistantBridgePublisher(),
    );

    await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/logs/recent",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body[0].action).toBe("haBridge.publish_failed");
    expect(body[0].domain).toBe("haBridge");
    expect(body[0].level).toBe("warn");
    expect(body[0].message).toBe("Synthetic HA bridge publish failure.");
  });

  it("clamps out-of-range volume commands", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "set_volume",
        volumePercent: 999,
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.media.volumePercent).toBe(100);
  });

  it("rejects invalid media command payloads", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "set_volume",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("invalid_command");
    expect(body.error.message).toBe("Invalid media command payload.");
  });

  it("returns an explicit idle media state when the library is empty", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-empty-library-"));
    app = buildApp({ logger: false }, tempDir);

    const response = await app.inject({
      method: "GET",
      url: "/api/media/state",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.queue).toEqual([]);
    expect(body.availability.overall).toBe("idle");
    expect(body.availability.library.status).toBe("empty");
    expect(body.availability.library.trackCount).toBe(0);
    expect(body.capabilities.play).toBe(false);
    expect(body.capabilities.next).toBe(false);
  });

  it("loads a real mp3 library from a configured folder", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-api-library-"));
    const albumPath = path.join(tempDir, "Daft Punk", "Discovery");

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "One More Time.mp3"), "");

    app = buildApp({ logger: false }, tempDir);

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].title).toBe("One More Time");
    expect(body[0].artist).toBe("Daft Punk");
    expect(body[0].album).toBe("Discovery");
  });

  it("streams a real mp3 file from the configured library", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-stream-library-"));
    const albumPath = path.join(tempDir, "Portishead", "Dummy");
    const fileContent = "fake-mp3-data";

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "Roads.mp3"), fileContent);

    app = buildApp({ logger: false }, tempDir);

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks/1/stream",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("audio/mpeg");
    expect(response.body).toBe(fileContent);
  });

  it("returns a generated fallback cover when the track has no sidecar image", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-cover-fallback-"));
    const albumPath = path.join(tempDir, "Bonobo", "Migration");

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "Kerala.mp3"), "fake-mp3-data");

    app = buildApp({ logger: false }, tempDir);

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks/1/cover",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/svg+xml");
    expect(response.body).toContain("<svg");
    expect(response.body).toContain("Kerala");
  });

  it("streams a sidecar cover image when one exists next to the track", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-cover-sidecar-"));
    const albumPath = path.join(tempDir, "Bonobo", "Migration");
    const coverContent = "png-cover-binary";

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "Kerala.mp3"), "fake-mp3-data");
    await writeFile(path.join(albumPath, "cover.png"), coverContent);

    app = buildApp({ logger: false }, tempDir);

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks/1/cover",
    });

    expect(response.statusCode).toBe(200);
    expect(response.headers["content-type"]).toContain("image/png");
    expect(response.body).toBe(coverContent);
  });

  it("returns 404 for a stream request when the file is unavailable", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks/999/stream",
    });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body.error.code).toBe("track_stream_unavailable");
    expect(body.error.message).toBe("Track file is not available for track 999.");
  });

  it("returns 404 when play_track references an unknown track", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play_track",
        trackId: 999,
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body.error.code).toBe("track_not_found");
    expect(body.error.message).toBe("Track not found: 999");
  });

  it("returns 409 when a queue-dependent command is sent for an empty library", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-empty-command-"));
    app = buildApp({ logger: false }, tempDir);

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "next",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(409);
    expect(body.error.code).toBe("command_conflict");
    expect(body.error.message).toBe("Cannot skip because the queue is empty.");
  });

  it("returns recent log entries after a media command", async () => {
    app = buildApp({ logger: false });

    await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/api/logs/recent",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0].action).toBe("media.play");
    expect(body[0].domain).toBe("media");
    expect(body[0].level).toBe("info");
    expect(body[0].message).toBe("Playing Midnight Groove");
  });

  it("rescans a configured media library", async () => {
    const bridgeSpy = createHomeAssistantBridgeSpy();
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-rescan-library-"));
    const albumPath = path.join(tempDir, "Massive Attack", "Mezzanine");

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "Teardrop.mp3"), "");

    app = buildApp({ logger: false }, tempDir, bridgeSpy.publisher);

    await writeFile(path.join(albumPath, "Angel.mp3"), "");

    const response = await app.inject({
      method: "POST",
      url: "/api/library/rescan",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.trackCount).toBe(2);
    expect(bridgeSpy.updates).toHaveLength(1);
    expect(bridgeSpy.updates[0].mediaState.availability.library.trackCount).toBe(2);
    expect(bridgeSpy.updates[0].event?.action).toBe("library.rescanned");
  });

  it("rejects rescan when no media library path is configured", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/library/rescan",
    });
    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error.code).toBe("media_library_path_missing");
    expect(body.error.message).toBe("MEDIA_LIBRARY_PATH is not configured.");
  });
});
