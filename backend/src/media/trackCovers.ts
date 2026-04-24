import fs from "node:fs";
import path from "node:path";
import type { MediaTrack } from "./types.js";

const SIDE_CAR_COVER_NAMES = [
  "cover.jpg",
  "cover.jpeg",
  "cover.png",
  "cover.webp",
  "folder.jpg",
  "folder.jpeg",
  "folder.png",
  "front.jpg",
  "front.jpeg",
  "front.png",
] as const;

const COVER_GRADIENTS = [
  ["#07111f", "#1d4f91", "#7be7ff"],
  ["#170d24", "#5a2ea6", "#ff6fd8"],
  ["#0d1d17", "#1f7a5f", "#9cffb2"],
  ["#201109", "#9b3d18", "#ffbe63"],
  ["#13172d", "#4058c9", "#f58bff"],
  ["#0d1d23", "#1f88a8", "#8ff7f0"],
] as const;

function escapeSvgText(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function hashSeed(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash;
}

function projectSeed(seed: number, shift: number, min: number, max: number) {
  const range = max - min;

  if (range <= 0) {
    return min;
  }

  return min + ((seed >>> shift) % (range + 1));
}

export function buildTrackCoverUrl(trackId: number) {
  return `/api/library/tracks/${trackId}/cover`;
}

export function findSidecarCoverPath(trackFilePath: string) {
  const albumDirectoryPath = path.dirname(trackFilePath);

  for (const fileName of SIDE_CAR_COVER_NAMES) {
    const candidatePath = path.join(albumDirectoryPath, fileName);
    if (fs.existsSync(candidatePath) && fs.statSync(candidatePath).isFile()) {
      return candidatePath;
    }
  }

  return null;
}

export function getTrackCoverContentType(filePath: string) {
  switch (path.extname(filePath).toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    default:
      return "application/octet-stream";
  }
}

export function buildFallbackTrackCoverSvg(
  track: Pick<MediaTrack, "title" | "artist" | "album">,
) {
  const seed = `${track.title}:${track.artist}:${track.album}`;
  const [backgroundStart, backgroundMid, backgroundEnd] =
    COVER_GRADIENTS[hashSeed(seed) % COVER_GRADIENTS.length];
  const [accentStart, accentMid, accentEnd] =
    COVER_GRADIENTS[(hashSeed(seed) >>> 3) % COVER_GRADIENTS.length];
  const numericSeed = hashSeed(seed);
  const title = escapeSvgText(track.title || "Unknown Track");
  const glowOneCx = projectSeed(numericSeed, 0, 140, 360);
  const glowOneCy = projectSeed(numericSeed, 5, 120, 300);
  const glowOneRadius = projectSeed(numericSeed, 9, 170, 250);
  const glowTwoCx = projectSeed(numericSeed, 11, 280, 520);
  const glowTwoCy = projectSeed(numericSeed, 15, 280, 520);
  const glowTwoRadius = projectSeed(numericSeed, 19, 150, 230);
  const tiltStart = projectSeed(numericSeed, 2, 0, 25);
  const tiltEnd = projectSeed(numericSeed, 7, 75, 100);
  const accentOpacity = (projectSeed(numericSeed, 4, 26, 42) / 100).toFixed(2);
  const streakOpacity = (projectSeed(numericSeed, 10, 8, 16) / 100).toFixed(2);
  const ringOpacity = (projectSeed(numericSeed, 14, 10, 18) / 100).toFixed(2);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" role="img" aria-label="${title}">
  <defs>
    <linearGradient id="bg" x1="${tiltStart}%" y1="0%" x2="${tiltEnd}%" y2="100%">
      <stop offset="0%" stop-color="${backgroundStart}" />
      <stop offset="48%" stop-color="${backgroundMid}" />
      <stop offset="100%" stop-color="${backgroundEnd}" />
    </linearGradient>
    <radialGradient id="glow-a" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentEnd}" stop-opacity="0.95" />
      <stop offset="55%" stop-color="${accentMid}" stop-opacity="0.35" />
      <stop offset="100%" stop-color="${accentMid}" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="glow-b" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="${accentStart}" stop-opacity="0.88" />
      <stop offset="62%" stop-color="${backgroundEnd}" stop-opacity="0.24" />
      <stop offset="100%" stop-color="${backgroundEnd}" stop-opacity="0" />
    </radialGradient>
    <linearGradient id="streak" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0" />
      <stop offset="50%" stop-color="#ffffff" stop-opacity="0.9" />
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0" />
    </linearGradient>
    <filter id="blur-xl">
      <feGaussianBlur stdDeviation="58" />
    </filter>
    <filter id="blur-md">
      <feGaussianBlur stdDeviation="18" />
    </filter>
  </defs>
  <rect width="640" height="640" rx="40" fill="url(#bg)" />
  <circle cx="${glowOneCx}" cy="${glowOneCy}" r="${glowOneRadius}" fill="url(#glow-a)" filter="url(#blur-xl)" opacity="${accentOpacity}" />
  <circle cx="${glowTwoCx}" cy="${glowTwoCy}" r="${glowTwoRadius}" fill="url(#glow-b)" filter="url(#blur-xl)" opacity="${accentOpacity}" />
  <circle cx="320" cy="320" r="176" fill="rgba(255,255,255,0.06)" />
  <circle cx="320" cy="320" r="130" fill="rgba(255,255,255,0.05)" />
  <circle cx="320" cy="320" r="92" fill="rgba(255,255,255,0.06)" />
  <circle cx="320" cy="320" r="202" fill="none" stroke="rgba(255,255,255,${ringOpacity})" stroke-width="2" />
  <circle cx="320" cy="320" r="228" fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="1.5" />
  <path d="M-40 456 C 120 388, 244 396, 356 340 S 560 216, 700 264" fill="none" stroke="rgba(255,255,255,${streakOpacity})" stroke-width="24" stroke-linecap="round" filter="url(#blur-md)" />
  <path d="M-80 194 C 96 270, 202 254, 318 198 S 528 108, 700 176" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="16" stroke-linecap="round" filter="url(#blur-md)" />
  <rect width="640" height="640" rx="40" fill="url(#streak)" opacity="0.08" />
</svg>`;
}
