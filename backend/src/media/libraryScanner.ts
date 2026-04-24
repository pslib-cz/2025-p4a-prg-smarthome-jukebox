import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import type { MediaTrack } from "./types.js";
import { buildTrackCoverUrl } from "./trackCovers.js";

const require = createRequire(import.meta.url);
const getMp3Duration = require("get-mp3-duration") as (buffer: Buffer) => number;

function humanizeSegment(value: string) {
  return value.replaceAll(/[_-]+/gu, " ").replaceAll(/\s+/gu, " ").trim();
}

function formatDurationLabel(durationMs: number) {
  if (!Number.isFinite(durationMs) || durationMs <= 0) {
    return "00:00";
  }

  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function readDurationLabelFromMp3File(
  filePath: string,
  getDurationMs: (buffer: Buffer) => number = getMp3Duration,
) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return formatDurationLabel(getDurationMs(fileBuffer));
  } catch {
    return "00:00";
  }
}

function collectMp3Files(libraryPath: string): string[] {
  const entries = fs.readdirSync(libraryPath, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const resolvedPath = path.join(libraryPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...collectMp3Files(resolvedPath));
      continue;
    }

    if (entry.isFile() && entry.name.toLowerCase().endsWith(".mp3")) {
      files.push(resolvedPath);
    }
  }

  return files;
}

function buildTrackFromFile(filePath: string, libraryPath: string, id: number): MediaTrack {
  const relativePath = path.relative(libraryPath, filePath);
  const relativeSegments = relativePath.split(path.sep);
  const title = humanizeSegment(path.basename(filePath, path.extname(filePath)));
  const album =
    relativeSegments.length >= 2
      ? humanizeSegment(relativeSegments.at(-2) ?? "")
      : "Unknown Album";
  const artist =
    relativeSegments.length >= 3
      ? humanizeSegment(relativeSegments.at(-3) ?? "")
      : "Unknown Artist";

  return {
    id,
    title,
    artist,
    album,
    duration: readDurationLabelFromMp3File(filePath),
    coverUrl: buildTrackCoverUrl(id),
    relativePath,
  };
}

export function scanMediaLibrary(libraryPath: string): MediaTrack[] {
  const resolvedLibraryPath = path.resolve(libraryPath);

  if (!fs.existsSync(resolvedLibraryPath)) {
    throw new Error(`Media library path does not exist: ${resolvedLibraryPath}`);
  }

  if (!fs.statSync(resolvedLibraryPath).isDirectory()) {
    throw new Error(`Media library path is not a directory: ${resolvedLibraryPath}`);
  }

  return collectMp3Files(resolvedLibraryPath)
    .sort((left, right) => left.localeCompare(right))
    .map((filePath, index) =>
      buildTrackFromFile(filePath, resolvedLibraryPath, index + 1),
    );
}
