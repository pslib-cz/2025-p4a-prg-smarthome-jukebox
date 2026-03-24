import type {
  AudioStatus,
  AutomationLaneState,
  ConnectionStatus,
  EventLogItem,
  JukeboxCommand,
  JukeboxPlaylist,
  JukeboxTheme,
  JukeboxTrack,
  MqttFeedLine,
  SpotifyState,
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
}

export interface BackendLibrarySnapshot {
  songs?: BackendTrackPayload[];
  playlists?: BackendPlaylistPayload[];
}

export interface BackendSnapshot {
  connectionStatus: ConnectionStatus;
  media?: BackendMediaStatePayload;
  library?: BackendLibrarySnapshot;
  receivedAt?: string;
  lastError?: string | null;
}

export interface HomeAssistantTelemetryTransport {
  loadSnapshot(): Promise<HomeAssistantTelemetrySnapshot>;
  subscribe?(
    onSnapshot: (snapshot: HomeAssistantTelemetrySnapshot) => void,
  ): (() => void) | Promise<() => void>;
}

export interface BackendTransport {
  loadSnapshot(): Promise<BackendSnapshot>;
  sendCommand(command: JukeboxCommand): Promise<void>;
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
