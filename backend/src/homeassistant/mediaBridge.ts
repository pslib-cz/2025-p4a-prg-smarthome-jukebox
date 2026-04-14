import type { FastifyBaseLogger } from "fastify";
import mqtt, { type IClientOptions, type MqttClient } from "mqtt";
import type { MqttBridgeConfig } from "../config/env.js";
import type { MediaLogEntry, MediaStateSnapshot } from "../media/types.js";
import type {
  BackendHomeAssistantBridgeHealthSnapshot,
  RuntimeLogLevel,
} from "../runtime/types.js";
import type {
  SpotifyAccountTier,
  SpotifyAuthStatus,
  SpotifyMockMode,
  SpotifyPlaybackStateSummary,
  SpotifySdkStatus,
  SpotifySessionSummary,
  SpotifyTransferStatus,
} from "../spotify/types.js";

const MQTT_RECONNECT_PERIOD_MS = 5_000;
const MQTT_PUBLISH_TIMEOUT_MS = 1_500;

export const MEDIA_STATE_TOPIC_SUFFIX = "media/state";
export const SYSTEM_HEALTH_TOPIC_SUFFIX = "system/health";
export const SYSTEM_EVENT_TOPIC_SUFFIX = "system/event";

export type HomeAssistantBackendStatus = "ready" | "degraded";
export type HomeAssistantEventLevel = "info" | "warn" | "error";
export type HomeAssistantEventSource = "backend" | "media-bridge";

export interface HomeAssistantMediaStatePayload {
  source: MediaStateSnapshot["source"];
  sourceLabel: string;
  spotifyConnected: boolean;
  isPlaying: boolean;
  activeTrackId: number | string;
  title: string;
  artist: string;
  album: string;
  progressPercent: number;
  positionMs: number;
  durationMs: number;
  volumePercent: number;
  availability: MediaStateSnapshot["availability"];
  spotify: HomeAssistantSpotifyMirrorPayload | null;
  timestamp: string;
}

export interface HomeAssistantSpotifyMirrorPayload {
  configured: boolean;
  authenticated: boolean;
  authStatus: SpotifyAuthStatus;
  accountTier: SpotifyAccountTier;
  sdkStatus: SpotifySdkStatus | null;
  transferStatus: SpotifyTransferStatus;
  deviceId: string | null;
  deviceName: string | null;
  isActiveDevice: boolean;
  isPlaying: boolean;
  trackId: string | null;
  title: string | null;
  artist: string | null;
  album: string | null;
  coverUrl: string | null;
  positionMs: number;
  durationMs: number;
  lastError: string | null;
  mockMode: SpotifyMockMode | null;
}

export interface HomeAssistantSpotifyMirrorState {
  session: SpotifySessionSummary;
  playback: SpotifyPlaybackStateSummary;
}

export interface HomeAssistantSystemHealthPayload {
  backendStatus: HomeAssistantBackendStatus;
  libraryStatus: MediaStateSnapshot["availability"]["library"]["status"];
  playerStatus: MediaStateSnapshot["availability"]["player"]["status"];
  pathConfigured: boolean;
  trackCount: number;
  playlistCount: number;
  lastError: string | null;
  timestamp: string;
}

export interface HomeAssistantSystemEventPayload {
  action: string;
  meta: string;
  level: HomeAssistantEventLevel;
  timestamp: string;
  source: HomeAssistantEventSource;
}

interface BridgeEventInput {
  action: string;
  meta: string;
  level: HomeAssistantEventLevel;
  timestamp?: string;
  source: HomeAssistantEventSource;
}

interface HomeAssistantBridgeHooks {
  onRuntimeLog?: (entry: {
    level: RuntimeLogLevel;
    action: string;
    message: string;
  }) => void;
}

export interface HomeAssistantBridgePublisher {
  publishStartup(
    mediaState: MediaStateSnapshot,
    spotify?: HomeAssistantSpotifyMirrorState | null,
  ): Promise<void>;
  publishMediaUpdate(
    mediaState: MediaStateSnapshot,
    event?: MediaLogEntry | null,
    spotify?: HomeAssistantSpotifyMirrorState | null,
  ): Promise<void>;
  getHealthSnapshot(): BackendHomeAssistantBridgeHealthSnapshot;
  close(): Promise<void>;
}

function joinTopic(prefix: string, suffix: string) {
  return `${prefix.replace(/\/+$/u, "")}/${suffix}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function calculateProgressPercent(positionMs: number, durationMs: number) {
  if (durationMs <= 0) {
    return 0;
  }

  return clampPercent((positionMs / durationMs) * 100);
}

function createHomeAssistantSpotifyMirrorPayload(
  spotify: HomeAssistantSpotifyMirrorState | null | undefined,
): HomeAssistantSpotifyMirrorPayload | null {
  if (!spotify) {
    return null;
  }

  return {
    configured: spotify.session.configured,
    authenticated: spotify.session.authenticated,
    authStatus: spotify.session.authStatus,
    accountTier: spotify.session.accountTier,
    sdkStatus: spotify.playback.sdkStatus,
    transferStatus: spotify.playback.transferStatus,
    deviceId: spotify.playback.deviceId,
    deviceName: spotify.playback.deviceName,
    isActiveDevice: spotify.playback.isActiveDevice,
    isPlaying: spotify.playback.isPlaying,
    trackId: spotify.playback.currentTrack?.id ?? null,
    title: spotify.playback.currentTrack?.title ?? null,
    artist: spotify.playback.currentTrack?.artist ?? null,
    album: spotify.playback.currentTrack?.album ?? null,
    coverUrl: spotify.playback.currentTrack?.coverUrl ?? null,
    positionMs: spotify.playback.positionMs,
    durationMs: spotify.playback.durationMs,
    lastError: spotify.playback.lastError ?? spotify.session.lastError,
    mockMode: spotify.playback.mockMode ?? spotify.session.mockMode,
  };
}

function isSpotifySourceActive(spotify: HomeAssistantSpotifyMirrorPayload | null) {
  if (!spotify || !spotify.authenticated) {
    return false;
  }

  return Boolean(
    spotify.transferStatus === "active" ||
      spotify.isPlaying ||
      spotify.trackId,
  );
}

export function createHomeAssistantMediaStatePayload(
  mediaState: MediaStateSnapshot,
  spotifyOrTimestamp: HomeAssistantSpotifyMirrorState | string | null = null,
  timestamp = new Date().toISOString(),
): HomeAssistantMediaStatePayload {
  const spotify =
    typeof spotifyOrTimestamp === "string" ? null : spotifyOrTimestamp;
  const resolvedTimestamp =
    typeof spotifyOrTimestamp === "string" ? spotifyOrTimestamp : timestamp;
  const spotifyPayload = createHomeAssistantSpotifyMirrorPayload(spotify);
  const spotifyActive = isSpotifySourceActive(spotifyPayload);

  return {
    source: spotifyActive ? "spotify" : mediaState.source,
    sourceLabel: spotifyActive ? "Spotify" : mediaState.sourceLabel,
    spotifyConnected: spotifyPayload?.authenticated ?? mediaState.spotifyConnected,
    isPlaying: spotifyActive ? spotifyPayload?.isPlaying ?? false : mediaState.isPlaying,
    activeTrackId:
      spotifyActive
        ? (spotifyPayload?.trackId ?? "spotify")
        : mediaState.activeTrackId,
    title:
      spotifyActive
        ? (spotifyPayload?.title ?? "Spotify")
        : mediaState.activeTrack.title,
    artist:
      spotifyActive
        ? (spotifyPayload?.artist ?? spotifyPayload?.deviceName ?? "Spotify")
        : mediaState.activeTrack.artist,
    album:
      spotifyActive
        ? (spotifyPayload?.album ?? "Spotify")
        : mediaState.activeTrack.album,
    progressPercent:
      spotifyActive
        ? calculateProgressPercent(
            spotifyPayload?.positionMs ?? 0,
            spotifyPayload?.durationMs ?? 0,
          )
        : mediaState.progressPercent,
    positionMs: spotifyActive ? spotifyPayload?.positionMs ?? 0 : mediaState.positionMs,
    durationMs: spotifyActive ? spotifyPayload?.durationMs ?? 0 : mediaState.durationMs,
    volumePercent: mediaState.volumePercent,
    availability: mediaState.availability,
    spotify: spotifyPayload,
    timestamp: resolvedTimestamp,
  };
}

export function createHomeAssistantSystemHealthPayload(
  mediaState: MediaStateSnapshot,
  lastError: string | null,
  timestamp = new Date().toISOString(),
): HomeAssistantSystemHealthPayload {
  return {
    backendStatus: lastError ? "degraded" : "ready",
    libraryStatus: mediaState.availability.library.status,
    playerStatus: mediaState.availability.player.status,
    pathConfigured: mediaState.availability.library.pathConfigured,
    trackCount: mediaState.availability.library.trackCount,
    playlistCount: mediaState.availability.library.playlistCount,
    lastError,
    timestamp,
  };
}

export function createHomeAssistantSystemEventPayload(
  event: BridgeEventInput,
): HomeAssistantSystemEventPayload {
  return {
    action: event.action,
    meta: event.meta,
    level: event.level,
    timestamp: event.timestamp ?? new Date().toISOString(),
    source: event.source,
  };
}

function createBridgeEventFromLogEntry(logEntry: MediaLogEntry): BridgeEventInput {
  return {
    action: logEntry.action,
    meta: logEntry.meta,
    level: "info",
    timestamp: logEntry.time,
    source: "backend",
  };
}

class NoopHomeAssistantBridgePublisher implements HomeAssistantBridgePublisher {
  private readonly healthSnapshot: BackendHomeAssistantBridgeHealthSnapshot;

  constructor(config: MqttBridgeConfig | null = null) {
    this.healthSnapshot = {
      status: "disabled",
      reason: "Home Assistant MQTT bridge is not configured.",
      lastChangedAt: new Date().toISOString(),
      configured: false,
      brokerUrl: config?.brokerUrl ?? null,
      topicPrefix: config?.topicPrefix ?? null,
      lastSuccessfulPublishAt: null,
    };
  }

  async publishStartup(
    _mediaState: MediaStateSnapshot,
    _spotify?: HomeAssistantSpotifyMirrorState | null,
  ) {}

  async publishMediaUpdate(
    _mediaState: MediaStateSnapshot,
    _event?: MediaLogEntry | null,
    _spotify?: HomeAssistantSpotifyMirrorState | null,
  ) {}

  getHealthSnapshot() {
    return structuredClone(this.healthSnapshot);
  }

  async close() {}
}

class MqttHomeAssistantBridgePublisher implements HomeAssistantBridgePublisher {
  private readonly client: MqttClient;
  private readonly mediaStateTopic: string;
  private readonly systemHealthTopic: string;
  private readonly systemEventTopic: string;
  private healthSnapshot: BackendHomeAssistantBridgeHealthSnapshot;
  private lastKnownSnapshot:
    | {
        mediaState: MediaStateSnapshot;
        spotify: HomeAssistantSpotifyMirrorState | null;
      }
    | null = null;
  private replayingLatestSnapshot = false;

  constructor(
    private readonly config: MqttBridgeConfig,
    private readonly logger: FastifyBaseLogger,
    private readonly hooks: HomeAssistantBridgeHooks = {},
  ) {
    const options: IClientOptions = {
      clientId: config.clientId,
      reconnectPeriod: MQTT_RECONNECT_PERIOD_MS,
    };

    if (config.username) {
      options.username = config.username;
    }

    if (config.password) {
      options.password = config.password;
    }

    this.client = mqtt.connect(config.brokerUrl!, options);
    this.mediaStateTopic = joinTopic(config.topicPrefix, MEDIA_STATE_TOPIC_SUFFIX);
    this.systemHealthTopic = joinTopic(config.topicPrefix, SYSTEM_HEALTH_TOPIC_SUFFIX);
    this.systemEventTopic = joinTopic(config.topicPrefix, SYSTEM_EVENT_TOPIC_SUFFIX);
    this.healthSnapshot = {
      status: "degraded",
      reason: "Waiting for MQTT bridge connection.",
      lastChangedAt: new Date().toISOString(),
      configured: true,
      brokerUrl: config.brokerUrl,
      topicPrefix: config.topicPrefix,
      lastSuccessfulPublishAt: null,
    };

    this.client.on("connect", () => {
      const wasDegraded = this.healthSnapshot.status !== "ready";

      this.updateHealthSnapshot("ready", null);
      this.logger.info(
        { brokerUrl: config.brokerUrl, clientId: config.clientId },
        "Connected HA MQTT bridge",
      );
      if (wasDegraded) {
        this.emitRuntimeLog("info", "haBridge.ready", "Home Assistant MQTT bridge is connected.");
      }

      if (wasDegraded && this.lastKnownSnapshot && !this.replayingLatestSnapshot) {
        this.replayingLatestSnapshot = true;
        void this.publishStateAndHealth(
          this.lastKnownSnapshot.mediaState,
          this.lastKnownSnapshot.spotify,
        ).finally(() => {
            this.replayingLatestSnapshot = false;
          });
      }
    });

    this.client.on("offline", () => {
      this.recordBridgeFailure("MQTT bridge is offline.");
    });

    this.client.on("error", (error) => {
      this.recordBridgeFailure(`MQTT bridge error: ${getErrorMessage(error)}`);
    });
  }

  async publishStartup(
    mediaState: MediaStateSnapshot,
    spotify: HomeAssistantSpotifyMirrorState | null = null,
  ) {
    await this.publishSnapshot(mediaState, {
      action: "backend.startup",
      meta: "Backend media bridge started.",
      level: "info",
      source: "backend",
    }, spotify);
  }

  async publishMediaUpdate(
    mediaState: MediaStateSnapshot,
    event?: MediaLogEntry | null,
    spotify: HomeAssistantSpotifyMirrorState | null = null,
  ) {
    await this.publishSnapshot(
      mediaState,
      event ? createBridgeEventFromLogEntry(event) : undefined,
      spotify,
    );
  }

  async close() {
    await new Promise<void>((resolve) => {
      this.client.end(false, {}, () => resolve());
    });
  }

  getHealthSnapshot() {
    return structuredClone(this.healthSnapshot);
  }

  private async publishSnapshot(
    mediaState: MediaStateSnapshot,
    event?: BridgeEventInput,
    spotify: HomeAssistantSpotifyMirrorState | null = null,
  ) {
    this.lastKnownSnapshot = {
      mediaState: structuredClone(mediaState),
      spotify: structuredClone(spotify),
    };

    await this.publishStateAndHealth(mediaState, spotify);

    if (event) {
      await this.publishTopic(
        this.systemEventTopic,
        createHomeAssistantSystemEventPayload(event),
        false,
      );
    }
  }

  private async publishStateAndHealth(
    mediaState: MediaStateSnapshot,
    spotify: HomeAssistantSpotifyMirrorState | null = null,
  ) {
    await this.publishTopic(
      this.mediaStateTopic,
      createHomeAssistantMediaStatePayload(mediaState, spotify),
      true,
    );
    await this.publishTopic(
      this.systemHealthTopic,
      createHomeAssistantSystemHealthPayload(mediaState, this.healthSnapshot.reason),
      true,
    );
  }

  private async publishTopic(topic: string, payload: unknown, retain: boolean) {
    try {
      await this.publishWithTimeout(topic, JSON.stringify(payload), retain);
      this.markPublishSuccess();
    } catch (error) {
      this.recordBridgeFailure(
        `Failed to publish ${topic}: ${getErrorMessage(error)}`,
      );
    }
  }

  private async publishWithTimeout(
    topic: string,
    payload: string,
    retain: boolean,
  ) {
    let timeoutId: NodeJS.Timeout | null = null;

    await Promise.race([
      new Promise<void>((resolve, reject) => {
        this.client.publish(
          topic,
          payload,
          { qos: 1, retain },
          (error?: Error | undefined) => {
            if (timeoutId) {
              clearTimeout(timeoutId);
            }

            if (error) {
              reject(error);
              return;
            }

            resolve();
          },
        );
      }),
      new Promise<void>((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error("Timed out waiting for MQTT publish acknowledgement."));
        }, MQTT_PUBLISH_TIMEOUT_MS);
      }),
    ]);
  }

  private recordBridgeFailure(message: string) {
    const changed = this.updateHealthSnapshot("degraded", message);
    this.logger.warn({ brokerUrl: this.config.brokerUrl, message }, "HA MQTT bridge degraded");

    if (changed) {
      this.emitRuntimeLog("warn", "haBridge.degraded", message);
    }
  }

  private markPublishSuccess() {
    this.healthSnapshot.lastSuccessfulPublishAt = new Date().toISOString();

    if (this.healthSnapshot.status !== "ready" || this.healthSnapshot.reason !== null) {
      this.updateHealthSnapshot("ready", null);
    }
  }

  private updateHealthSnapshot(
    status: BackendHomeAssistantBridgeHealthSnapshot["status"],
    reason: string | null,
  ) {
    const changed =
      status !== this.healthSnapshot.status || reason !== this.healthSnapshot.reason;

    this.healthSnapshot = {
      ...this.healthSnapshot,
      status,
      reason,
      lastChangedAt: changed
        ? new Date().toISOString()
        : this.healthSnapshot.lastChangedAt,
    };

    return changed;
  }

  private emitRuntimeLog(
    level: RuntimeLogLevel,
    action: string,
    message: string,
  ) {
    this.hooks.onRuntimeLog?.({
      level,
      action,
      message,
    });
  }
}

export function createHomeAssistantBridgePublisher(
  logger: FastifyBaseLogger,
  config: MqttBridgeConfig | null = null,
  hooks: HomeAssistantBridgeHooks = {},
): HomeAssistantBridgePublisher {
  if (!config?.brokerUrl) {
    return new NoopHomeAssistantBridgePublisher(config);
  }

  return new MqttHomeAssistantBridgePublisher(config, logger, hooks);
}

export function isHomeAssistantBridgePublisher(
  value: unknown,
): value is HomeAssistantBridgePublisher {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<HomeAssistantBridgePublisher>;
  return (
    typeof candidate.publishStartup === "function" &&
    typeof candidate.publishMediaUpdate === "function" &&
    typeof candidate.getHealthSnapshot === "function" &&
    typeof candidate.close === "function"
  );
}
