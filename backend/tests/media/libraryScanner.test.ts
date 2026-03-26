import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { scanMediaLibrary } from "../../src/media/libraryScanner.js";

let tempDir: string | null = null;

async function createTempLibrary() {
  tempDir = await mkdtemp(path.join(os.tmpdir(), "hajukebox-library-"));
  return tempDir;
}

afterEach(async () => {
  if (tempDir) {
    await rm(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("scanMediaLibrary", () => {
  it("reads mp3 files from a nested artist/album structure", async () => {
    const libraryPath = await createTempLibrary();
    const albumPath = path.join(libraryPath, "Boards Of Canada", "Tomorrow's Harvest");

    await mkdir(albumPath, { recursive: true });
    await writeFile(path.join(albumPath, "Reach_For_The_Dead.mp3"), "");
    await writeFile(path.join(albumPath, "notes.txt"), "");

    const tracks = scanMediaLibrary(libraryPath);

    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({
      id: 1,
      title: "Reach For The Dead",
      artist: "Boards Of Canada",
      album: "Tomorrow's Harvest",
    });
  });

  it("returns an empty list for an empty library", async () => {
    const libraryPath = await createTempLibrary();

    expect(scanMediaLibrary(libraryPath)).toEqual([]);
  });

  it("throws when the media library path does not exist", () => {
    expect(() =>
      scanMediaLibrary("/tmp/hajukebox-missing-library"),
    ).toThrowError("Media library path does not exist:");
  });
});
