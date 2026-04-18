import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";

let app: FastifyInstance | null = null;
let tempDir: string | null = null;

async function createLibraryFixture() {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-playlists-"));

  await mkdir(path.join(tempDir, "Signal Arcade", "Album One"), {
    recursive: true,
  });
  await mkdir(path.join(tempDir, "Quiet Form", "Album Two"), {
    recursive: true,
  });

  await writeFile(
    path.join(tempDir, "Signal Arcade", "Album One", "first-light.mp3"),
    "fixture-a",
  );
  await writeFile(
    path.join(tempDir, "Signal Arcade", "Album One", "second-wave.mp3"),
    "fixture-b",
  );
  await writeFile(
    path.join(tempDir, "Quiet Form", "Album Two", "third-room.mp3"),
    "fixture-c",
  );

  return tempDir;
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

describe("playlist media commands", () => {
  it("replaces the active queue with the selected playlist", async () => {
    app = buildApp({ logger: false }, await createLibraryFixture());

    const playlistsResponse = await app.inject({
      method: "GET",
      url: "/api/library/playlists",
    });
    const playlists = playlistsResponse.json();
    const albumOnePlaylist = playlists.find(
      (playlist: { name: string }) => playlist.name === "Album One",
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play_playlist",
        playlistId: albumOnePlaylist.id,
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.media.isPlaying).toBe(true);
    expect(body.media.queue).toHaveLength(2);
    expect(body.media.queue.every((track: { album: string }) => track.album === "Album One")).toBe(true);
    expect(body.media.activeTrackId).toBe(body.media.queue[0].id);
  });

  it("returns playlist_not_found for unknown playlist ids", async () => {
    app = buildApp({ logger: false }, await createLibraryFixture());

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play_playlist",
        playlistId: 999,
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(404);
    expect(body.error.code).toBe("playlist_not_found");
  });

  it("restores the full library queue when a track outside the playlist is selected", async () => {
    app = buildApp({ logger: false }, await createLibraryFixture());

    const playlistsResponse = await app.inject({
      method: "GET",
      url: "/api/library/playlists",
    });
    const playlists = playlistsResponse.json();
    const albumOnePlaylist = playlists.find(
      (playlist: { name: string }) => playlist.name === "Album One",
    );
    const tracksResponse = await app.inject({
      method: "GET",
      url: "/api/library/tracks",
    });
    const tracks = tracksResponse.json();
    const outsideTrack = tracks.find(
      (track: { album: string }) => track.album !== "Album One",
    );

    await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play_playlist",
        playlistId: albumOnePlaylist.id,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/media/command",
      payload: {
        type: "play_track",
        trackId: outsideTrack.id,
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.media.queue).toHaveLength(3);
    expect(body.media.activeTrackId).toBe(outsideTrack.id);
  });
});
