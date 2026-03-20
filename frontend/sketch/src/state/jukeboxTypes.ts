export type JukeboxTheme = "casual" | "disco" | "focus" | "eco";
export type MediaSource = "local" | "spotify";
export type ConnectionStatus =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected"
  | "error";

export interface JukeboxTrack {
  id: number;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverUrl: string;
}

export interface JukeboxPlaylist {
  id: number;
  name: string;
  songCount: number;
  icon: string;
}

export interface AudioStatus {
  quality: string;
  codec: string;
  bufferPercent: number;
  dspProfile: string;
}

export interface MediaState {
  source: MediaSource;
  sourceLabel: string;
  spotifyConnected: boolean;
  isPlaying: boolean;
  progressPercent: number;
  volumePercent: number;
  activeTrackId: number;
  activeTrack: JukeboxTrack;
  queue: JukeboxTrack[];
  audio: AudioStatus;
}

export interface PresenceState {
  confidencePercent: number;
  reason: string;
  distanceCm: number;
  clapCountToday: number;
}

export interface DistancePoint {
  time: string;
  value: number;
}

export interface MqttFeedLine {
  direction: string;
  topic: string;
  payload: string;
  tone: "recv" | "send" | "sys";
}

export interface EventLogItem {
  time: string;
  action: string;
  meta: string;
}

export interface SystemHealthState {
  mqttStatus: string;
  mqttSecurity: string;
  uptime: string;
  rssiDbm: string;
  brokerLatency: string;
}

export interface TelemetryState {
  presence: PresenceState;
  distanceSeries: DistancePoint[];
  mqttFeed: MqttFeedLine[];
  eventLog: EventLogItem[];
  system: SystemHealthState;
}

export interface LibraryState {
  songs: JukeboxTrack[];
  playlists: JukeboxPlaylist[];
}

export interface JukeboxAppState {
  theme: JukeboxTheme;
  connectionStatus: ConnectionStatus;
  media: MediaState;
  library: LibraryState;
  telemetry: TelemetryState;
}

export type JukeboxCommand =
  | { type: "play" }
  | { type: "pause" }
  | { type: "next" }
  | { type: "previous" }
  | { type: "seek"; progressPercent: number }
  | { type: "set_volume"; volumePercent: number }
  | { type: "set_theme"; theme: JukeboxTheme }
  | { type: "set_spotify_connection"; connected: boolean }
  | { type: "set_dsp_profile"; profile: string }
  | { type: "play_track"; trackId: number };

export interface JukeboxDataSource {
  getInitialState(): Promise<JukeboxAppState>;
  sendCommand(command: JukeboxCommand): Promise<void>;
  subscribe?(
    onState: (state: JukeboxAppState) => void,
  ): (() => void) | Promise<() => void>;
}
