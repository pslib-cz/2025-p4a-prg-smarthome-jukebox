import path from "node:path";
import {
  getLibraryPlaylists,
  getLibraryTracks,
  getMediaState,
} from "./mockCatalog.js";
import {
  commandConflict,
  mediaLibraryPathMissing,
  trackNotFound,
  trackStreamUnavailable,
} from "./errors.js";
import { scanMediaLibrary } from "./libraryScanner.js";
import type {
  MediaCommand,
  MediaLogEntry,
  MediaPlaylist,
  MediaStateSnapshot,
  MediaTrack,
} from "./types.js";
import type {
  BackendMediaLibraryHealthSnapshot,
  RuntimeLogDomain,
  RuntimeLogLevel,
} from "../runtime/types.js";

function cloneState<T>(value: T): T {
  return structuredClone(value);
}

function inferLogDomain(action: string): RuntimeLogDomain {
  if (action.startsWith("media.")) {
    return "media";
  }

  if (action.startsWith("library.")) {
    return "library";
  }

  if (action.startsWith("haBridge.") || action.startsWith("bridge.")) {
    return "haBridge";
  }

  return "system";
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseDurationLabelToMs(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return 0;
  }

  const segments = trimmed.split(":").map((segment) => Number.parseInt(segment, 10));

  if (
    segments.length < 2 ||
    segments.length > 3 ||
    segments.some((segment) => !Number.isInteger(segment) || segment < 0)
  ) {
    return 0;
  }

  if (segments.length === 2) {
    const [minutes, seconds] = segments;
    return (minutes * 60 + seconds) * 1000;
  }

  const [hours, minutes, seconds] = segments;
  return (hours * 3600 + minutes * 60 + seconds) * 1000;
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
  const durationMs = parseDurationLabelToMs(activeTrack.duration);

  return {
    source: "local",
    sourceLabel: "Local MP3",
    spotifyConnected: false,
    isPlaying: false,
    progressPercent: 0,
    positionMs: 0,
    durationMs,
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
    availability: {
      overall: tracks.length > 0 ? "ready" : "idle",
      library: {
        status: tracks.length > 0 ? "ready" : "empty",
        trackCount: tracks.length,
        playlistCount: tracks.length > 0 ? 1 : 0,
        pathConfigured: false,
      },
      player: {
        status: tracks.length > 0 ? "ready" : "idle",
        reason: tracks.length > 0 ? null : "No local tracks available.",
      },
    },
    capabilities: {
      play: tracks.length > 0,
      pause: tracks.length > 0,
      next: tracks.length > 0,
      previous: tracks.length > 0,
      seek: durationMs > 0,
      setVolume: true,
      playTrack: tracks.length > 0,
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
  private libraryHealthSnapshot: BackendMediaLibraryHealthSnapshot = {
    status: "degraded",
    reason: "Backend media library is not initialized.",
    lastChangedAt: new Date().toISOString(),
    pathConfigured: false,
    trackCount: 0,
    playlistCount: 0,
  };

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
    this.refreshLibraryHealthSnapshot();
    this.log("library.mock", "Using bundled mock library.");
  }

  getState() {
    return cloneState(this.buildPublicState());
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

  getLatestLogEntry() {
    return cloneState(this.logs.at(-1) ?? null);
  }

  getLibraryHealthSnapshot() {
    return cloneState(this.libraryHealthSnapshot);
  }

  recordRuntimeEvent(
    action: string,
    message: string,
    options: {
      level?: RuntimeLogLevel;
      domain?: RuntimeLogDomain;
    } = {},
  ) {
    this.log(action, message, options);
  }

  getTrackStreamPath(trackId: number) {
    const filePath = this.trackFilePaths.get(trackId);

    if (!filePath) {
      throw trackStreamUnavailable(trackId);
    }

    return filePath;
  }

  rescanLibrary() {
    if (!this.mediaLibraryPath) {
      throw mediaLibraryPathMissing();
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
        this.ensureQueueAvailable("Cannot play because the queue is empty.");
        this.state.isPlaying = true;
        this.log("media.play", `Playing ${this.state.activeTrack.title}`);
        return this.getState();

      case "pause":
        this.state.isPlaying = false;
        this.log("media.pause", `Paused ${this.state.activeTrack.title}`);
        return this.getState();

      case "next":
        this.ensureQueueAvailable("Cannot skip because the queue is empty.");
        this.cycleTrack("next");
        this.log("media.next", `Active track is now ${this.state.activeTrack.title}`);
        return this.getState();

      case "previous":
        this.ensureQueueAvailable("Cannot go to the previous track because the queue is empty.");
        this.cycleTrack("previous");
        this.log("media.previous", `Active track is now ${this.state.activeTrack.title}`);
        return this.getState();

      case "seek":
        if (this.state.durationMs <= 0) {
          throw commandConflict(
            "Cannot seek because the active track duration is unavailable.",
          );
        }

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
    this.refreshLibraryHealthSnapshot();
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

  private log(
    action: string,
    message: string,
    options: {
      level?: RuntimeLogLevel;
      domain?: RuntimeLogDomain;
    } = {},
  ) {
    const level = options.level ?? "info";
    const domain = options.domain ?? inferLogDomain(action);

    this.logs.push({
      id: this.nextLogId,
      time: new Date().toISOString(),
      level,
      domain,
      action,
      message,
      meta: message,
    });

    if (this.logs.length > 50) {
      this.logs.shift();
    }

    this.nextLogId += 1;
  }

  private cycleTrack(direction: "next" | "previous") {
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
      throw trackNotFound(trackId);
    }

    this.state.activeTrackId = nextTrack.id;
    this.state.activeTrack = nextTrack;
    this.state.progressPercent = 0;
    this.state.positionMs = 0;
    this.state.durationMs = parseDurationLabelToMs(nextTrack.duration);
  }

  private refreshLibraryHealthSnapshot() {
    const publicState = this.buildPublicState();
    const pathConfigured = publicState.availability.library.pathConfigured;
    const trackCount = publicState.availability.library.trackCount;
    const playlistCount = publicState.availability.library.playlistCount;

    let status: BackendMediaLibraryHealthSnapshot["status"] = "ready";
    let reason: string | null = null;

    if (trackCount <= 0 && pathConfigured) {
      status = "degraded";
      reason = "Configured media library is empty.";
    } else if (trackCount <= 0) {
      status = "degraded";
      reason = "No local media tracks are available.";
    }

    const nextSnapshot = {
      status,
      reason,
      lastChangedAt: this.libraryHealthSnapshot.lastChangedAt,
      pathConfigured,
      trackCount,
      playlistCount,
    } satisfies BackendMediaLibraryHealthSnapshot;

    if (
      nextSnapshot.status !== this.libraryHealthSnapshot.status ||
      nextSnapshot.reason !== this.libraryHealthSnapshot.reason ||
      nextSnapshot.pathConfigured !== this.libraryHealthSnapshot.pathConfigured ||
      nextSnapshot.trackCount !== this.libraryHealthSnapshot.trackCount ||
      nextSnapshot.playlistCount !== this.libraryHealthSnapshot.playlistCount
    ) {
      nextSnapshot.lastChangedAt = new Date().toISOString();
    }

    this.libraryHealthSnapshot = nextSnapshot;
  }

  private ensureQueueAvailable(message: string) {
    if (this.state.queue.length === 0) {
      throw commandConflict(message);
    }
  }

  private buildPublicState(): MediaStateSnapshot {
    const queue = this.state.queue;
    const hasTracks = queue.length > 0;
    const playerStatus = hasTracks ? "ready" : "idle";
    const playerReason = hasTracks ? null : "No local tracks available.";
    const pathConfigured = this.mediaLibraryPath !== null;

    return {
      ...this.state,
      availability: {
        overall: hasTracks ? "ready" : "idle",
        library: {
          status: hasTracks ? "ready" : "empty",
          trackCount: this.tracks.length,
          playlistCount: this.playlists.length,
          pathConfigured,
        },
        player: {
          status: playerStatus,
          reason: playerReason,
        },
      },
      capabilities: {
        play: hasTracks,
        pause: hasTracks,
        next: hasTracks,
        previous: hasTracks,
        seek: hasTracks && this.state.durationMs > 0,
        setVolume: true,
        playTrack: hasTracks,
      },
    };
  }
}
