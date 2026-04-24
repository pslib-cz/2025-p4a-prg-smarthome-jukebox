import os from "node:os";
import path from "node:path";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import {
  readDurationLabelFromMp3File,
  scanMediaLibrary,
} from "../../src/media/libraryScanner.js";

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
      coverUrl: "/api/library/tracks/1/cover",
      duration: "00:00",
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

  it("formats a parsed mp3 duration as mm:ss", async () => {
    const libraryPath = await createTempLibrary();
    const filePath = path.join(libraryPath, "track.mp3");

    await writeFile(filePath, "synthetic-audio");

    expect(
      readDurationLabelFromMp3File(filePath, () => 285_000),
    ).toBe("04:45");
  });

  it("returns 00:00 when the parser reports a zero duration", async () => {
    const libraryPath = await createTempLibrary();
    const filePath = path.join(libraryPath, "track.mp3");

    await writeFile(filePath, "synthetic-audio");

    expect(
      readDurationLabelFromMp3File(filePath, () => 0),
    ).toBe("00:00");
  });

  it("returns 00:00 when mp3 duration parsing fails", async () => {
    const libraryPath = await createTempLibrary();
    const filePath = path.join(libraryPath, "track.mp3");

    await writeFile(filePath, "synthetic-audio");

    expect(
      readDurationLabelFromMp3File(filePath, () => {
        throw new Error("synthetic parse error");
      }),
    ).toBe("00:00");
  });
});
