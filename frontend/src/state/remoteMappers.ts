import type {
  BackendDependencyStatus,
  ConnectionStatus,
  JukeboxAppState,
  JukeboxPlaylist,
  JukeboxTrack,
  LibraryState,
  MediaState,
  SpotifyState,
  SystemHealthState,
  TelemetryState,
} from "./jukeboxTypes";
import {
  DEFAULT_HA_ENTITY_MAP,
  type BackendDependencyHealthPayload,
  type BackendHealthPayload,
  type BackendPlaylistPayload,
  type BackendSpotifyPlaybackPayload,
  type BackendSpotifySessionPayload,
  type BackendSpotifyTrackPayload,
  type BackendSnapshot,
  type BackendTrackPayload,
  type HomeAssistantEntityMap,
  type HomeAssistantEntityState,
  type HomeAssistantTelemetrySnapshot,
} from "./remoteContracts";
import { modeLabelToTheme } from "./modeState";

const MAX_DISTANCE_POINTS = 8;
const MAX_CLAP_TRACE_POINTS = 16;
const MIN_IDLE_CLAP_BAR = 14;

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseNumber(value: string | number | undefined | null) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const normalized = Number.parseFloat(value.replace(",", "."));
  return Number.isFinite(normalized) ? normalized : null;
}

function parseTrackId(value: number | string | undefined | null) {
  if (typeof value === "number" && Number.isInteger(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) ? parsed : null;
}

function hashTrackId(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash || 1;
}

function normalizeTrackId(
  value: number | string | undefined | null,
  fallbackId: number,
  fallbackIndex = 0,
) {
  const parsed = parseTrackId(value);

  if (parsed !== null) {
    return parsed;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return hashTrackId(value.trim());
  }

  return fallbackId || fallbackIndex + 1;
}

function formatMetric(value: number | null, unit: string, fallback: string) {
  if (value === null) {
    return fallback;
  }

  return `${Math.round(value)} ${unit}`;
}

function formatDurationMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function formatTimeLabel(timestamp: string | undefined, fallback: string) {
  if (!timestamp) {
    return fallback;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getTrimmedString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function findEntity(
  entities: HomeAssistantEntityState[],
  entityId: string,
) {
  return entities.find((entity) => entity.entity_id === entityId);
}

function getEntityString(
  entity: HomeAssistantEntityState | undefined,
  fallback: string,
) {
  if (!entity) {
    return fallback;
  }

  const trimmed = entity.state.trim();
  return trimmed.length > 0 && trimmed.toLowerCase() !== "unknown"
    ? trimmed
    : fallback;
}

function getEntityNumber(
  entity: HomeAssistantEntityState | undefined,
  fallback: number,
) {
  return parseNumber(entity?.state) ?? fallback;
}

function isEntityOn(entity: HomeAssistantEntityState | undefined) {
  return entity?.state.toLowerCase() === "on";
}

function normalizeTrackPayload(
  payload: BackendTrackPayload,
  fallbackTrack: JukeboxTrack,
  fallbackIndex = 0,
): JukeboxTrack {
  const id = normalizeTrackId(payload.id, fallbackTrack.id, fallbackIndex);

  return {
    id,
    title: payload.title.trim() || fallbackTrack.title,
    artist: payload.artist.trim() || fallbackTrack.artist,
    album: payload.album.trim() || fallbackTrack.album,
    duration: payload.duration.trim() || fallbackTrack.duration,
    coverUrl: payload.coverUrl?.trim() || fallbackTrack.coverUrl,
  };
}

function normalizePlaylistPayload(
  payload: BackendPlaylistPayload,
  fallbackIndex = 0,
): JukeboxPlaylist {
  return {
    id: parseTrackId(payload.id) ?? fallbackIndex + 1,
    name: payload.name.trim() || `Playlist ${fallbackIndex + 1}`,
    songCount: Math.max(0, Math.round(payload.songCount)),
    icon: payload.icon?.trim() || "◉",
  };
}

function appendDistancePoint(
  previousSeries: TelemetryState["distanceSeries"],
  nextValue: number,
  timestamp: string | undefined,
) {
  const nextPoint = {
    time: formatTimeLabel(
      timestamp,
      previousSeries.at(-1)?.time ?? "Now",
    ),
    value: Math.max(0, Math.round(nextValue)),
  };
  const lastPoint = previousSeries.at(-1);

  if (
    lastPoint &&
    lastPoint.time === nextPoint.time &&
    lastPoint.value === nextPoint.value
  ) {
    return previousSeries;
  }

  return [...previousSeries.slice(-(MAX_DISTANCE_POINTS - 1)), nextPoint];
}

function appendClapTrace(
  previousTrace: number[],
  previousCount: number,
  nextCount: number,
) {
  const clapDetected = nextCount > previousCount;
  const nextBar = clapDetected ? 100 : MIN_IDLE_CLAP_BAR;

  return [...previousTrace.slice(-(MAX_CLAP_TRACE_POINTS - 1)), nextBar];
}

function normalizeBackendRuntimeStatus(
  status: BackendHealthPayload["status"],
  fallback: SystemHealthState["backendRuntime"]["status"],
): SystemHealthState["backendRuntime"]["status"] {
  switch (status) {
    case "ok":
    case "degraded":
    case "unavailable":
      return status;
    default:
      return fallback;
  }
}

function normalizeDependencyStatus(
  status: BackendDependencyHealthPayload["status"],
  fallback: BackendDependencyStatus,
): BackendDependencyStatus {
  switch (status) {
    case "ready":
    case "degraded":
    case "unavailable":
    case "disabled":
      return status;
    default:
      return fallback;
  }
}

function normalizeSpotifyAuthStatus(
  status: BackendSpotifySessionPayload["authStatus"],
  fallback: SpotifyState["authStatus"],
): SpotifyState["authStatus"] {
  switch (status) {
    case "disconnected":
    case "authorizing":
    case "connected":
    case "error":
      return status;
    default:
      return fallback;
  }
}

function normalizeSpotifySdkStatus(
  status: BackendSpotifyPlaybackPayload["sdkStatus"],
  fallback: SpotifyState["sdkStatus"],
): SpotifyState["sdkStatus"] {
  switch (status) {
    case "idle":
    case "loading":
    case "ready":
    case "not_ready":
    case "error":
      return status;
    default:
      return fallback;
  }
}

function normalizeSpotifyTransferStatus(
  status: BackendSpotifyPlaybackPayload["transferStatus"],
  fallback: SpotifyState["transferStatus"],
): SpotifyState["transferStatus"] {
  switch (status) {
    case "idle":
    case "pending":
    case "active":
    case "error":
      return status;
    default:
      return fallback;
  }
}

function normalizeSpotifyAccountTier(
  status: BackendSpotifySessionPayload["accountTier"],
  fallback: SpotifyState["accountTier"],
): SpotifyState["accountTier"] {
  switch (status) {
    case "unknown":
    case "free":
    case "premium":
      return status;
    default:
      return fallback;
  }
}

function mapBackendHealthToSystem(
  snapshot: BackendSnapshot,
  previousSystem: SystemHealthState,
): SystemHealthState {
  const health = snapshot.health;

  if (!health) {
    return previousSystem;
  }

  const previousRuntime = previousSystem.backendRuntime;
  const mediaLibrary = health.dependencies?.mediaLibrary;
  const haBridge = health.dependencies?.haBridge;

  return {
    ...previousSystem,
    backendRuntime: {
      status: normalizeBackendRuntimeStatus(
        health.status,
        previousRuntime.status,
      ),
      service:
        getTrimmedString(health.service) ?? previousRuntime.service,
      updatedAt: health.timestamp ?? previousRuntime.updatedAt,
      mediaLibraryStatus: normalizeDependencyStatus(
        mediaLibrary?.status,
        previousRuntime.mediaLibraryStatus,
      ),
      mediaLibraryReason:
        getTrimmedString(mediaLibrary?.reason) ?? previousRuntime.mediaLibraryReason,
      haBridgeStatus: normalizeDependencyStatus(
        haBridge?.status,
        previousRuntime.haBridgeStatus,
      ),
      haBridgeReason:
        getTrimmedString(haBridge?.reason) ?? previousRuntime.haBridgeReason,
      lastSuccessfulPublishAt:
        haBridge?.lastSuccessfulPublishAt ??
        previousRuntime.lastSuccessfulPublishAt,
    },
  };
}

function normalizeSpotifyTrackPayload(
  payload: BackendSpotifyTrackPayload,
  fallbackTrack: JukeboxTrack | null,
): JukeboxTrack | null {
  const title = payload.title?.trim();

  if (!title) {
    return fallbackTrack;
  }

  const durationMs = parseNumber(payload.durationMs) ?? 0;

  return {
    id: normalizeTrackId(payload.id, fallbackTrack?.id ?? 900),
    title,
    artist: payload.artist?.trim() || fallbackTrack?.artist || "Spotify",
    album: payload.album?.trim() || fallbackTrack?.album || "Spotify",
    duration: formatDurationMs(durationMs),
    coverUrl:
      payload.coverUrl?.trim() ||
      fallbackTrack?.coverUrl ||
      "/covers/midnight-groove.png",
  };
}

export function deriveConnectionStatus(
  haStatus: ConnectionStatus,
  backendStatus: ConnectionStatus,
): ConnectionStatus {
  if (haStatus === "error" || backendStatus === "error") {
    return "error";
  }

  if (haStatus === "connected" && backendStatus === "connected") {
    return "connected";
  }

  if (haStatus === "disconnected" && backendStatus === "disconnected") {
    return "disconnected";
  }

  if (haStatus === "idle" || backendStatus === "idle") {
    return "idle";
  }

  return "connecting";
}

export function mapHomeAssistantSnapshotToTelemetry(
  snapshot: HomeAssistantTelemetrySnapshot,
  previousTelemetry: TelemetryState,
  entityMap: HomeAssistantEntityMap = DEFAULT_HA_ENTITY_MAP,
): TelemetryState {
  const distanceEntity = findEntity(snapshot.entities, entityMap.distanceCm);
  const confidenceEntity = findEntity(
    snapshot.entities,
    entityMap.presenceConfidence,
  );
  const reasonEntity = findEntity(snapshot.entities, entityMap.presenceReason);
  const clapCountEntity = findEntity(snapshot.entities, entityMap.clapCountToday);
  const voiceSourceEntity = findEntity(snapshot.entities, entityMap.voiceSource);
  const voiceCommandEntity = findEntity(snapshot.entities, entityMap.voiceCommand);
  const voiceResponseEntity = findEntity(snapshot.entities, entityMap.voiceResponse);
  const rssiEntity = findEntity(snapshot.entities, entityMap.esp32Rssi);
  const latencyEntity = findEntity(snapshot.entities, entityMap.brokerLatencyMs);
  const uptimeEntity = findEntity(snapshot.entities, entityMap.uptime);
  const mqttConnectedEntity = findEntity(
    snapshot.entities,
    entityMap.mqttConnected,
  );
  const modeEntity = findEntity(snapshot.entities, entityMap.mode);

  const nextDistance = getEntityNumber(
    distanceEntity,
    previousTelemetry.presence.distanceCm,
  );
  const nextClapCount = getEntityNumber(
    clapCountEntity,
    previousTelemetry.presence.clapCountToday,
  );
  const nextTimestamp =
    snapshot.receivedAt ??
    distanceEntity?.last_updated ??
    clapCountEntity?.last_updated;
  const nextVoiceUpdatedAt =
    voiceCommandEntity?.last_updated ??
    voiceResponseEntity?.last_updated ??
    voiceSourceEntity?.last_updated ??
    snapshot.receivedAt;

  return {
    presence: {
      confidencePercent: clampPercent(
        getEntityNumber(
          confidenceEntity,
          previousTelemetry.presence.confidencePercent,
        ),
      ),
      reason: getEntityString(reasonEntity, previousTelemetry.presence.reason),
      distanceCm: Math.max(0, Math.round(nextDistance)),
      clapCountToday: Math.max(0, Math.round(nextClapCount)),
      lastClapAt:
        nextClapCount > previousTelemetry.presence.clapCountToday
          ? formatTimeLabel(
              clapCountEntity?.last_updated ?? snapshot.receivedAt,
              previousTelemetry.presence.lastClapAt,
            )
          : previousTelemetry.presence.lastClapAt,
      lastMode: getEntityString(modeEntity, previousTelemetry.presence.lastMode),
    },
    voiceAssistant: {
      source: getEntityString(
        voiceSourceEntity,
        previousTelemetry.voiceAssistant.source,
      ),
      command: getEntityString(
        voiceCommandEntity,
        previousTelemetry.voiceAssistant.command,
      ),
      response: getEntityString(
        voiceResponseEntity,
        previousTelemetry.voiceAssistant.response,
      ),
      updatedAt: formatTimeLabel(
        nextVoiceUpdatedAt,
        previousTelemetry.voiceAssistant.updatedAt,
      ),
    },
    distanceSeries: distanceEntity
      ? appendDistancePoint(previousTelemetry.distanceSeries, nextDistance, nextTimestamp)
      : previousTelemetry.distanceSeries,
    clapTrace: clapCountEntity
      ? appendClapTrace(
          previousTelemetry.clapTrace,
          previousTelemetry.presence.clapCountToday,
          nextClapCount,
        )
      : previousTelemetry.clapTrace,
    mqttFeed: snapshot.mqttFeed ?? previousTelemetry.mqttFeed,
    eventLog: snapshot.eventLog ?? previousTelemetry.eventLog,
    system: {
      mqttStatus: isEntityOn(mqttConnectedEntity) ? "Connected" : "Disconnected",
      mqttSecurity:
        (mqttConnectedEntity?.attributes?.security as string | undefined)?.trim() ||
        previousTelemetry.system.mqttSecurity,
      uptime: getEntityString(uptimeEntity, previousTelemetry.system.uptime),
      rssiDbm: formatMetric(
        parseNumber(rssiEntity?.state),
        "dBm",
        previousTelemetry.system.rssiDbm,
      ),
      brokerLatency: formatMetric(
        parseNumber(latencyEntity?.state),
        "ms",
        previousTelemetry.system.brokerLatency,
      ),
      backendRuntime: previousTelemetry.system.backendRuntime,
    },
    automationLanes:
      snapshot.automationLanes ?? previousTelemetry.automationLanes,
  };
}

export function mapBackendSnapshotToMedia(
  snapshot: BackendSnapshot,
  previousMedia: MediaState,
): MediaState {
  const mediaPayload = snapshot.media;

  if (!mediaPayload) {
    return previousMedia;
  }

  const fallbackTrack =
    previousMedia.queue.find(
      (track) => track.id === previousMedia.activeTrackId,
    ) ?? previousMedia.activeTrack;
  const normalizedQueue =
    mediaPayload.queue?.map((track, index) =>
      normalizeTrackPayload(track, fallbackTrack, index),
    ) ?? previousMedia.queue;
  const normalizedActiveTrack = mediaPayload.activeTrack
    ? normalizeTrackPayload(mediaPayload.activeTrack, fallbackTrack)
    : normalizedQueue.find(
        (track) =>
          track.id ===
          (parseTrackId(mediaPayload.activeTrackId) ?? previousMedia.activeTrackId),
      ) ?? previousMedia.activeTrack;

  const durationMs = parseNumber(mediaPayload.durationMs);
  const positionMs = parseNumber(mediaPayload.positionMs);
  const computedProgress =
    durationMs && durationMs > 0 && positionMs !== null
      ? (positionMs / durationMs) * 100
      : null;

  return {
    source: mediaPayload.source ?? previousMedia.source,
    sourceLabel: mediaPayload.sourceLabel ?? previousMedia.sourceLabel,
    spotifyConnected:
      mediaPayload.spotifyConnected ?? previousMedia.spotifyConnected,
    isPlaying: mediaPayload.isPlaying ?? previousMedia.isPlaying,
    progressPercent: clampPercent(
      parseNumber(mediaPayload.progressPercent) ?? computedProgress ?? previousMedia.progressPercent,
    ),
    volumePercent: clampPercent(
      parseNumber(mediaPayload.volumePercent) ?? previousMedia.volumePercent,
    ),
    activeTrackId:
      normalizeTrackId(mediaPayload.activeTrackId, normalizedActiveTrack.id),
    activeTrack: normalizedActiveTrack,
    queue: normalizedQueue,
    audio: {
      quality: mediaPayload.audio?.quality ?? previousMedia.audio.quality,
      codec: mediaPayload.audio?.codec ?? previousMedia.audio.codec,
      bufferPercent: clampPercent(
        parseNumber(mediaPayload.audio?.bufferPercent) ??
          previousMedia.audio.bufferPercent,
      ),
      dspProfile:
        mediaPayload.audio?.dspProfile ?? previousMedia.audio.dspProfile,
    },
  };
}

export function mapBackendSnapshotToLibrary(
  snapshot: BackendSnapshot,
  previousLibrary: LibraryState,
  fallbackTrack: JukeboxTrack,
): LibraryState {
  const libraryPayload = snapshot.library;

  if (!libraryPayload) {
    return previousLibrary;
  }

  return {
    songs:
      libraryPayload.songs?.map((track, index) =>
        normalizeTrackPayload(track, fallbackTrack, index),
      ) ?? previousLibrary.songs,
    playlists:
      libraryPayload.playlists?.map((playlist, index) =>
        normalizePlaylistPayload(playlist, index),
      ) ?? previousLibrary.playlists,
  };
}

export function mapBackendSnapshotToSpotify(
  snapshot: BackendSnapshot,
  previousSpotify: SpotifyState,
): SpotifyState {
  const session = snapshot.spotifySession;
  const playback = snapshot.spotifyPlayback;

  if (!session && !playback) {
    return previousSpotify;
  }

  let nextSpotify: SpotifyState = {
    ...previousSpotify,
  };

  if (session) {
    const authenticated = Boolean(session.authenticated);

    nextSpotify = {
      ...nextSpotify,
      configured: session.configured ?? nextSpotify.configured,
      authStatus: normalizeSpotifyAuthStatus(
        session.authStatus,
        authenticated ? "connected" : nextSpotify.authStatus,
      ),
      accountTier: normalizeSpotifyAccountTier(
        session.accountTier,
        nextSpotify.accountTier,
      ),
      scopes:
        session.scopes && session.scopes.length > 0
          ? [...session.scopes]
          : nextSpotify.scopes,
      expiresAt: session.expiresAt ?? nextSpotify.expiresAt,
      lastError: getTrimmedString(session.lastError) ?? nextSpotify.lastError,
      mockMode:
        session.mockMode === undefined ? nextSpotify.mockMode : session.mockMode,
    };

    if (!authenticated) {
      nextSpotify = {
        ...nextSpotify,
        authStatus: normalizeSpotifyAuthStatus(
          session.authStatus,
          "disconnected",
        ),
        transferStatus:
          nextSpotify.authStatus === "error" ? "error" : "idle",
        isActiveDevice: false,
        deviceId: null,
        currentTrack: null,
        positionMs: 0,
        durationMs: 0,
      };
    }
  }

  if (playback) {
    const fallbackTrack = nextSpotify.currentTrack ?? previousSpotify.currentTrack;
    const normalizedTrack = playback.currentTrack
      ? normalizeSpotifyTrackPayload(playback.currentTrack, fallbackTrack)
      : playback.authenticated
        ? nextSpotify.currentTrack
        : null;

    nextSpotify = {
      ...nextSpotify,
      sdkStatus: normalizeSpotifySdkStatus(
        playback.sdkStatus,
        nextSpotify.sdkStatus,
      ),
      transferStatus: normalizeSpotifyTransferStatus(
        playback.transferStatus,
        nextSpotify.transferStatus,
      ),
      deviceId: getTrimmedString(playback.deviceId) ?? nextSpotify.deviceId,
      deviceName:
        getTrimmedString(playback.deviceName) ?? nextSpotify.deviceName,
      isActiveDevice:
        typeof playback.isActiveDevice === "boolean"
          ? playback.isActiveDevice
          : nextSpotify.isActiveDevice,
      currentTrack: normalizedTrack,
      positionMs: Math.max(
        0,
        Math.round(parseNumber(playback.positionMs) ?? nextSpotify.positionMs),
      ),
      durationMs: Math.max(
        0,
        Math.round(parseNumber(playback.durationMs) ?? nextSpotify.durationMs),
      ),
      lastError: getTrimmedString(playback.lastError) ?? nextSpotify.lastError,
      mockMode:
        playback.mockMode === undefined ? nextSpotify.mockMode : playback.mockMode,
    };
  }

  return nextSpotify;
}

export function buildJukeboxStateFromRemoteSnapshots(
  previousState: JukeboxAppState,
  snapshots: {
    ha?: HomeAssistantTelemetrySnapshot;
    backend?: BackendSnapshot;
    entityMap?: HomeAssistantEntityMap;
  },
): JukeboxAppState {
  const nextTelemetryBase = snapshots.ha
    ? mapHomeAssistantSnapshotToTelemetry(
        snapshots.ha,
        previousState.telemetry,
        snapshots.entityMap,
      )
    : previousState.telemetry;
  const nextMedia = snapshots.backend
    ? mapBackendSnapshotToMedia(snapshots.backend, previousState.media)
    : previousState.media;
  const nextLibrary = snapshots.backend
    ? mapBackendSnapshotToLibrary(
        snapshots.backend,
        previousState.library,
        nextMedia.activeTrack,
      )
    : previousState.library;
  const nextSpotify = snapshots.backend
    ? mapBackendSnapshotToSpotify(snapshots.backend, previousState.spotify)
    : previousState.spotify;
  const nextTelemetry =
    snapshots.backend
      ? {
          ...nextTelemetryBase,
          system: mapBackendHealthToSystem(
            snapshots.backend,
            nextTelemetryBase.system,
          ),
          eventLog:
            snapshots.backend.eventLog !== undefined
              ? snapshots.backend.eventLog
              : nextTelemetryBase.eventLog,
        }
      : nextTelemetryBase;
  const nextConnectionStatus =
    snapshots.ha && snapshots.backend
      ? deriveConnectionStatus(
          snapshots.ha.connectionStatus,
          snapshots.backend.connectionStatus,
        )
      : snapshots.ha?.connectionStatus ??
        snapshots.backend?.connectionStatus ??
        previousState.connectionStatus;

  return {
    ...previousState,
    connectionStatus: nextConnectionStatus,
    theme: modeLabelToTheme(nextTelemetry.presence.lastMode),
    media: {
      ...nextMedia,
      spotifyConnected: nextSpotify.authStatus === "connected",
    },
    library: nextLibrary,
    telemetry: nextTelemetry,
    spotify: nextSpotify,
  };
}
