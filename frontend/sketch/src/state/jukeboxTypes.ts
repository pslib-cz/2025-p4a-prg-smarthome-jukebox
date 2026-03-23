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

export type SpotifyAuthStatus =
  | "disconnected"
  | "authorizing"
  | "connected"
  | "error";

export type SpotifySdkStatus =
  | "idle"
  | "loading"
  | "ready"
  | "not_ready"
  | "error";

export type SpotifyTransferStatus = "idle" | "pending" | "active" | "error";
export type SpotifyAccountTier = "unknown" | "free" | "premium";

export interface SpotifyState {
  authStatus: SpotifyAuthStatus;
  sdkStatus: SpotifySdkStatus;
  transferStatus: SpotifyTransferStatus;
  accountTier: SpotifyAccountTier;
  deviceId: string | null;
  deviceName: string;
  isActiveDevice: boolean;
  lastError: string | null;
  currentTrack: JukeboxTrack | null;
  positionMs: number;
  durationMs: number;
  scopes: string[];
}

export interface PresenceState {
  confidencePercent: number;
  reason: string;
  distanceCm: number;
  clapCountToday: number;
  lastClapAt: string;
  lastMode: string;
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

export interface AutomationLaneState {
  source: string;
  fusion: string;
  action: string;
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
  clapTrace: number[];
  mqttFeed: MqttFeedLine[];
  eventLog: EventLogItem[];
  system: SystemHealthState;
  automationLanes: AutomationLaneState[];
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
  spotify: SpotifyState;
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
  | { type: "spotify_authorize" }
  | { type: "spotify_sdk_ready"; deviceId?: string; deviceName?: string }
  | { type: "spotify_transfer_playback" }
  | { type: "spotify_disconnect" }
  | { type: "play_track"; trackId: number };

export interface JukeboxDataSource {
  getInitialState(): Promise<JukeboxAppState>;
  sendCommand(command: JukeboxCommand): Promise<void>;
  subscribe?(
    onState: (state: JukeboxAppState) => void,
  ): (() => void) | Promise<() => void>;
}
