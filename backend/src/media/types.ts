import type { RuntimeLogDomain, RuntimeLogLevel } from "../runtime/types.js";

export interface MediaTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverUrl: string;
  relativePath?: string;
}

export interface MediaPlaylist {
  id: number;
  name: string;
  songCount: number;
  icon: string;
  trackIds: number[];
}

export interface MediaAudioStatus {
  quality: string;
  codec: string;
  bufferPercent: number;
  dspProfile: string;
}

export type MediaOverallAvailability = "ready" | "idle" | "unavailable";
export type MediaLibraryAvailability = "ready" | "empty" | "unavailable";
export type MediaPlayerAvailability = "ready" | "idle" | "unavailable";

export interface MediaAvailabilitySnapshot {
  overall: MediaOverallAvailability;
  library: {
    status: MediaLibraryAvailability;
    trackCount: number;
    playlistCount: number;
    pathConfigured: boolean;
  };
  player: {
    status: MediaPlayerAvailability;
    reason: string | null;
  };
}

export interface MediaCapabilitySnapshot {
  play: boolean;
  pause: boolean;
  next: boolean;
  previous: boolean;
  seek: boolean;
  setVolume: boolean;
  playTrack: boolean;
}

export interface MediaStateSnapshot {
  source: "local" | "spotify";
  sourceLabel: string;
  spotifyConnected: boolean;
  isPlaying: boolean;
  progressPercent: number;
  positionMs: number;
  durationMs: number;
  volumePercent: number;
  activeTrackId: number;
  activeTrack: MediaTrack;
  queue: MediaTrack[];
  audio: MediaAudioStatus;
  availability: MediaAvailabilitySnapshot;
  capabilities: MediaCapabilitySnapshot;
}

export interface MediaLogEntry {
  id: number;
  time: string;
  level: RuntimeLogLevel;
  domain: RuntimeLogDomain;
  action: string;
  message: string;
  meta: string;
}

export type MediaErrorCode =
  | "invalid_command"
  | "invalid_track_id"
  | "playlist_not_found"
  | "media_library_path_missing"
  | "track_not_found"
  | "track_stream_unavailable"
  | "command_conflict"
  | "dependency_unavailable"
  | "internal_error";

export interface MediaErrorResponse {
  error: {
    code: MediaErrorCode;
    message: string;
  };
}

export interface MediaCommandResponse {
  ok: true;
  media: MediaStateSnapshot;
}

export interface MediaLibraryRescanResponse {
  ok: true;
  trackCount: number;
  playlistCount: number;
}

export type MediaCommand =
  | { type: "play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "play_playlist"; playlistId: number }
  | { type: "seek"; progressPercent: number }
  | { type: "set_volume"; volumePercent: number }
  | { type: "play_track"; trackId: number };
