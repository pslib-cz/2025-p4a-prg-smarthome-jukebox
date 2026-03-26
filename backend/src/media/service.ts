import path from "node:path";
import {
  getLibraryPlaylists,
  getLibraryTracks,
  getMediaState,
} from "./mockCatalog.js";
import { scanMediaLibrary } from "./libraryScanner.js";
import type {
  MediaCommand,
  MediaLogEntry,
  MediaPlaylist,
  MediaStateSnapshot,
  MediaTrack,
} from "./types.js";

function cloneState<T>(value: T): T {
  return structuredClone(value);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function createFallbackTrack(title: string): MediaTrack {
  return {
    id: 0,
    title,
    artist: "HAJukeBox",
    album: "System",
    duration: "00:00",
    coverUrl: "",
  };
}

function createMediaStateFromTracks(tracks: MediaTrack[]): MediaStateSnapshot {
  const activeTrack =
    tracks[0] ?? createFallbackTrack("No local tracks found");

  return {
    source: "local",
    sourceLabel: "Local MP3",
    spotifyConnected: false,
    isPlaying: false,
    progressPercent: 0,
    positionMs: 0,
    durationMs: 0,
    volumePercent: 72,
    activeTrackId: activeTrack.id,
    activeTrack,
    queue: tracks,
    audio: {
      quality: tracks.length > 0 ? "Ready" : "Idle",
      codec: tracks.length > 0 ? "MP3" : "None",
      bufferPercent: tracks.length > 0 ? 100 : 0,
      dspProfile: "Flat",
    },
  };
}

function humanizePlaylistName(mediaLibraryPath: string) {
  const baseName = path.basename(mediaLibraryPath);
  return baseName.trim().length > 0 ? baseName : "Local Library";
}

function createPlaylists(
  tracks: MediaTrack[],
  mediaLibraryPath: string | null,
): MediaPlaylist[] {
  if (tracks.length === 0) {
    return [];
  }

  return [
    {
      id: 1,
      name: mediaLibraryPath ? humanizePlaylistName(mediaLibraryPath) : "Local Library",
      songCount: tracks.length,
      icon: "◉",
    },
  ];
}

function parseTrackId(value: unknown) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

export function isMediaCommand(value: unknown): value is MediaCommand {
  if (!value || typeof value !== "object") {
    return false;
  }

  const command = value as Record<string, unknown>;

  switch (command.type) {
    case "play":
    case "pause":
    case "next":
    case "previous":
      return true;

    case "seek":
      return typeof command.progressPercent === "number";

    case "set_volume":
      return typeof command.volumePercent === "number";

    case "play_track":
      return parseTrackId(command.trackId) !== null;

    default:
      return false;
  }
}

export class InMemoryMediaService {
  private tracks: MediaTrack[] = [];
  private playlists: MediaPlaylist[] = [];
  private state: MediaStateSnapshot = createMediaStateFromTracks([]);
  private readonly logs: MediaLogEntry[] = [];
  private readonly trackFilePaths = new Map<number, string>();
  private nextLogId = 1;
  private readonly mediaLibraryPath: string | null;

  constructor(mediaLibraryPath: string | null = null) {
    this.mediaLibraryPath = mediaLibraryPath;

    if (mediaLibraryPath) {
      this.loadLibrary(mediaLibraryPath);
      this.log("library.scanned", `Loaded ${this.tracks.length} track(s) from ${mediaLibraryPath}`);
      return;
    }

    this.tracks = cloneState(getLibraryTracks());
    this.playlists = cloneState(getLibraryPlaylists());
    this.state = cloneState(getMediaState());
    this.log("library.mock", "Using bundled mock library.");
  }

  getState() {
    return cloneState(this.state);
  }

  getTracks() {
    return cloneState(this.tracks);
  }

  getPlaylists() {
    return cloneState(this.playlists);
  }

  getRecentLogs() {
    return cloneState([...this.logs].reverse());
  }

  getTrackStreamPath(trackId: number) {
    const filePath = this.trackFilePaths.get(trackId);

    if (!filePath) {
      throw new Error(`Track file is not available for track ${trackId}.`);
    }

    return filePath;
  }

  rescanLibrary() {
    if (!this.mediaLibraryPath) {
      throw new Error("MEDIA_LIBRARY_PATH is not configured.");
    }

    this.loadLibrary(this.mediaLibraryPath);
    this.log(
      "library.rescanned",
      `Loaded ${this.tracks.length} track(s) from ${this.mediaLibraryPath}`,
    );

    return {
      trackCount: this.tracks.length,
      playlistCount: this.playlists.length,
    };
  }

  applyCommand(command: MediaCommand) {
    switch (command.type) {
      case "play":
        this.state.isPlaying = true;
        this.log("media.play", `Playing ${this.state.activeTrack.title}`);
        return this.getState();

      case "pause":
        this.state.isPlaying = false;
        this.log("media.pause", `Paused ${this.state.activeTrack.title}`);
        return this.getState();

      case "next":
        this.cycleTrack("next");
        this.log("media.next", `Active track is now ${this.state.activeTrack.title}`);
        return this.getState();

      case "previous":
        this.cycleTrack("previous");
        this.log("media.previous", `Active track is now ${this.state.activeTrack.title}`);
        return this.getState();

      case "seek":
        this.state.progressPercent = clampPercent(command.progressPercent);
        this.state.positionMs = Math.round(
          (this.state.durationMs * this.state.progressPercent) / 100,
        );
        this.log("media.seek", `Seeked to ${this.state.progressPercent}%`);
        return this.getState();

      case "set_volume":
        this.state.volumePercent = clampPercent(command.volumePercent);
        this.log("media.volume", `Volume set to ${this.state.volumePercent}%`);
        return this.getState();

      case "play_track":
        this.setActiveTrack(command.trackId);
        this.state.isPlaying = true;
        this.log("media.play_track", `Playing ${this.state.activeTrack.title}`);
        return this.getState();
    }
  }

  private loadLibrary(mediaLibraryPath: string) {
    const scannedTracks = scanMediaLibrary(mediaLibraryPath);

    this.tracks = cloneState(scannedTracks);
    this.playlists = cloneState(createPlaylists(scannedTracks, mediaLibraryPath));
    this.state = cloneState(createMediaStateFromTracks(scannedTracks));
    this.trackFilePaths.clear();

    for (const track of scannedTracks) {
      if (track.relativePath) {
        this.trackFilePaths.set(
          track.id,
          path.resolve(mediaLibraryPath, track.relativePath),
        );
      }
    }
  }

  private log(action: string, meta: string) {
    this.logs.push({
      id: this.nextLogId,
      time: new Date().toISOString(),
      action,
      meta,
    });

    if (this.logs.length > 50) {
      this.logs.shift();
    }

    this.nextLogId += 1;
  }

  private cycleTrack(direction: "next" | "previous") {
    if (this.state.queue.length === 0) {
      return;
    }

    const activeIndex = this.state.queue.findIndex(
      (track) => track.id === this.state.activeTrackId,
    );
    const safeIndex = activeIndex >= 0 ? activeIndex : 0;
    const nextIndex =
      direction === "next"
        ? (safeIndex + 1) % this.state.queue.length
        : (safeIndex - 1 + this.state.queue.length) % this.state.queue.length;

    this.setActiveTrack(this.state.queue[nextIndex].id);
  }

  private setActiveTrack(trackId: number) {
    const nextTrack =
      this.state.queue.find((track) => track.id === trackId) ??
      this.tracks.find((track) => track.id === trackId);

    if (!nextTrack) {
      throw new Error(`Track not found: ${trackId}`);
    }

    this.state.activeTrackId = nextTrack.id;
    this.state.activeTrack = nextTrack;
    this.state.progressPercent = 0;
    this.state.positionMs = 0;
  }
}
