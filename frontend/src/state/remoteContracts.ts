import type {
  AudioStatus,
  AutomationLaneState,
  ConnectionStatus,
  EventLogItem,
  JukeboxCommand,
  JukeboxMode,
  JukeboxPlaylist,
  JukeboxTheme,
  JukeboxTrack,
  MqttFeedLine,
  SpotifyAccountTier,
  SpotifyAuthStatus,
  SpotifyMockMode,
  SpotifySdkStatus,
  SpotifyState,
  SpotifyTransferStatus,
} from "./jukeboxTypes";

export interface HomeAssistantEntityState {
  entity_id: string;
  state: string;
  attributes?: Record<string, unknown>;
  last_changed?: string;
  last_updated?: string;
}

export interface HomeAssistantEntityMap {
  distanceCm: string;
  presenceConfidence: string;
  presenceReason: string;
  clapCountToday: string;
  voiceSource: string;
  voiceCommand: string;
  voiceResponse: string;
  esp32Rssi: string;
  brokerLatencyMs: string;
  uptime: string;
  mqttConnected: string;
  mode: string;
}

export const DEFAULT_HA_ENTITY_MAP: HomeAssistantEntityMap = {
  distanceCm: "sensor.hajukebox_distance_cm",
  presenceConfidence: "sensor.hajukebox_presence_confidence",
  presenceReason: "sensor.hajukebox_presence_reason",
  clapCountToday: "sensor.hajukebox_clap_count_today",
  voiceSource: "input_text.hajukebox_last_voice_source",
  voiceCommand: "input_text.hajukebox_last_voice_command",
  voiceResponse: "input_text.hajukebox_last_voice_response",
  esp32Rssi: "sensor.hajukebox_esp32_rssi",
  brokerLatencyMs: "sensor.hajukebox_broker_latency_ms",
  uptime: "sensor.hajukebox_uptime",
  mqttConnected: "binary_sensor.hajukebox_mqtt_connected",
  mode: "input_select.hajukebox_mode",
};

export interface HomeAssistantTelemetrySnapshot {
  connectionStatus: ConnectionStatus;
  entities: HomeAssistantEntityState[];
  mqttFeed?: MqttFeedLine[];
  eventLog?: EventLogItem[];
  automationLanes?: AutomationLaneState[];
  receivedAt?: string;
  lastError?: string | null;
}

export interface BackendTrackPayload {
  id: number | string;
  title: string;
  artist: string;
  album: string;
  duration: string;
  coverUrl?: string;
}

export interface BackendPlaylistPayload {
  id: number | string;
  name: string;
  songCount: number;
  icon?: string;
  trackIds?: Array<number | string>;
}

export interface BackendLogPayload {
  id: number | string;
  time: string;
  action: string;
  meta?: string;
  level?: "info" | "warn" | "error";
  domain?: string;
  message?: string;
}

export interface BackendErrorPayload {
  error?: {
    code?: string;
    message?: string;
  };
}

export interface BackendMediaAvailabilityPayload {
  overall?: "ready" | "idle" | "unavailable";
  library?: {
    status?: "ready" | "empty" | "unavailable";
    trackCount?: number;
    playlistCount?: number;
    pathConfigured?: boolean;
  };
  player?: {
    status?: "ready" | "idle" | "unavailable";
    reason?: string | null;
  };
}

export interface BackendMediaCapabilitiesPayload {
  play?: boolean;
  pause?: boolean;
  next?: boolean;
  previous?: boolean;
  seek?: boolean;
  setVolume?: boolean;
  playTrack?: boolean;
}

export interface BackendMediaStatePayload {
  source?: "local" | "spotify";
  sourceLabel?: string;
  spotifyConnected?: boolean;
  isPlaying?: boolean;
  progressPercent?: number;
  positionMs?: number;
  durationMs?: number;
  volumePercent?: number;
  activeTrackId?: number | string;
  activeTrack?: BackendTrackPayload | null;
  queue?: BackendTrackPayload[];
  audio?: Partial<AudioStatus>;
  availability?: BackendMediaAvailabilityPayload;
  capabilities?: BackendMediaCapabilitiesPayload;
}

export interface BackendLibrarySnapshot {
  songs?: BackendTrackPayload[];
  playlists?: BackendPlaylistPayload[];
}

export type BackendRuntimeHealthPayloadStatus =
  | "ok"
  | "degraded"
  | "unavailable";

export type BackendDependencyHealthPayloadStatus =
  | "ready"
  | "degraded"
  | "unavailable"
  | "disabled";

export interface BackendDependencyHealthPayload {
  status?: BackendDependencyHealthPayloadStatus;
  reason?: string | null;
  lastChangedAt?: string;
}

export interface BackendMediaLibraryHealthPayload
  extends BackendDependencyHealthPayload {
  pathConfigured?: boolean;
  trackCount?: number;
  playlistCount?: number;
}

export interface BackendHaBridgeHealthPayload
  extends BackendDependencyHealthPayload {
  configured?: boolean;
  brokerUrl?: string | null;
  topicPrefix?: string | null;
  lastSuccessfulPublishAt?: string | null;
}

export interface BackendSpotifyHealthPayload
  extends BackendDependencyHealthPayload {
  configured?: boolean;
  clientIdConfigured?: boolean;
  redirectUri?: string | null;
  frontendRedirectUri?: string | null;
  scopes?: string[];
}

export interface BackendHealthPayload {
  status?: BackendRuntimeHealthPayloadStatus;
  service?: string;
  timestamp?: string;
  dependencies?: {
    mediaLibrary?: BackendMediaLibraryHealthPayload;
    haBridge?: BackendHaBridgeHealthPayload;
    spotify?: BackendSpotifyHealthPayload;
  };
}

export interface BackendSpotifySessionPayload {
  configured?: boolean;
  authenticated?: boolean;
  authStatus?: SpotifyAuthStatus;
  accountTier?: SpotifyAccountTier;
  expiresAt?: string | null;
  scopes?: string[];
  lastError?: string | null;
  mockMode?: SpotifyMockMode | null;
}

export interface BackendSpotifyTrackPayload {
  id?: string;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  coverUrl?: string | null;
}

export interface BackendSpotifyPlaybackPayload {
  authenticated?: boolean;
  sdkStatus?: SpotifySdkStatus | null;
  transferStatus?: SpotifyTransferStatus;
  deviceId?: string | null;
  deviceName?: string | null;
  isActiveDevice?: boolean;
  isPlaying?: boolean;
  positionMs?: number;
  durationMs?: number;
  currentTrack?: BackendSpotifyTrackPayload | null;
  lastError?: string | null;
  mockMode?: SpotifyMockMode | null;
}

export interface BackendSnapshot {
  connectionStatus: ConnectionStatus;
  health?: BackendHealthPayload;
  media?: BackendMediaStatePayload;
  library?: BackendLibrarySnapshot;
  spotifySession?: BackendSpotifySessionPayload;
  spotifyPlayback?: BackendSpotifyPlaybackPayload;
  eventLog?: EventLogItem[];
  receivedAt?: string;
  lastError?: string | null;
}

export interface HomeAssistantTelemetryTransport {
  loadSnapshot(): Promise<HomeAssistantTelemetrySnapshot>;
  sendModeCommand(mode: JukeboxMode): Promise<void>;
  subscribe?(
    onSnapshot: (snapshot: HomeAssistantTelemetrySnapshot) => void,
  ): (() => void) | Promise<() => void>;
}

export interface BackendTransport {
  loadSnapshot(): Promise<BackendSnapshot>;
  sendCommand(command: JukeboxCommand): Promise<void>;
  startSpotifyLogin(): Promise<void>;
  transferSpotifyPlayback(payload: {
    deviceId: string;
    deviceName?: string;
    play?: boolean;
  }): Promise<void>;
  disconnectSpotify(): Promise<void>;
  subscribe?(
    onSnapshot: (snapshot: BackendSnapshot) => void,
  ): (() => void) | Promise<() => void>;
}

export interface RemoteJukeboxTransports {
  ha: HomeAssistantTelemetryTransport;
  backend: BackendTransport;
  entityMap?: HomeAssistantEntityMap;
  initialTheme?: JukeboxTheme;
  initialSpotifyState?: SpotifyState;
}

export interface RemoteJukeboxStateSeed {
  theme: JukeboxTheme;
  spotify: SpotifyState;
  media: {
    activeTrack: JukeboxTrack;
  };
  library: {
    playlists: JukeboxPlaylist[];
  };
}
