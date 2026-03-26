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
}

export interface MediaAudioStatus {
  quality: string;
  codec: string;
  bufferPercent: number;
  dspProfile: string;
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
}

export interface MediaLogEntry {
  id: number;
  time: string;
  action: string;
  meta: string;
}

export type MediaCommand =
  | { type: "play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "seek"; progressPercent: number }
  | { type: "set_volume"; volumePercent: number }
  | { type: "play_track"; trackId: number };
