import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";

let app: FastifyInstance | null = null;
let tempDir: string | null = null;

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
  it("returns a health payload", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/health",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.status).toBe("ok");
    expect(body.service).toBe("hajukebox-backend");
    expect(typeof body.timestamp).toBe("string");
  });

  it("returns a placeholder local media state", async () => {
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
    app = buildApp({ logger: false });

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
    expect(body.error).toBe("Invalid media command payload.");
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

  it("returns 404 for a stream request when the file is unavailable", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "GET",
      url: "/api/library/tracks/999/stream",
    });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body.error).toBe("Track file is not available for track 999.");
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
  });

  it("rescans a configured media library", async () => {
    tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-rescan-library-"));
    const albumPath = path.join(tempDir, "Massive Attack", "Mezzanine");

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "Teardrop.mp3"), "");

    app = buildApp({ logger: false }, tempDir);

    await writeFile(path.join(albumPath, "Angel.mp3"), "");

    const response = await app.inject({
      method: "POST",
      url: "/api/library/rescan",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.trackCount).toBe(2);
  });

  it("rejects rescan when no media library path is configured", async () => {
    app = buildApp({ logger: false });

    const response = await app.inject({
      method: "POST",
      url: "/api/library/rescan",
    });
    const body = response.json();

    expect(response.statusCode).toBe(400);
    expect(body.error).toBe("MEDIA_LIBRARY_PATH is not configured.");
  });
});
