import type {
  ConnectionStatus,
  JukeboxAppState,
  JukeboxPlaylist,
  JukeboxTrack,
  LibraryState,
  MediaState,
  TelemetryState,
} from "./jukeboxTypes";
import {
  DEFAULT_HA_ENTITY_MAP,
  type BackendPlaylistPayload,
  type BackendSnapshot,
  type BackendTrackPayload,
  type HomeAssistantEntityMap,
  type HomeAssistantEntityState,
  type HomeAssistantTelemetrySnapshot,
} from "./remoteContracts";

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

function formatMetric(value: number | null, unit: string, fallback: string) {
  if (value === null) {
    return fallback;
  }

  return `${Math.round(value)} ${unit}`;
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
  const id =
    parseTrackId(payload.id) ?? parseTrackId(fallbackTrack.id) ?? fallbackIndex + 1;

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
      parseTrackId(mediaPayload.activeTrackId) ?? normalizedActiveTrack.id,
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

export function buildJukeboxStateFromRemoteSnapshots(
  previousState: JukeboxAppState,
  snapshots: {
    ha?: HomeAssistantTelemetrySnapshot;
    backend?: BackendSnapshot;
    entityMap?: HomeAssistantEntityMap;
  },
): JukeboxAppState {
  const nextTelemetry = snapshots.ha
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
    media: nextMedia,
    library: nextLibrary,
    telemetry: nextTelemetry,
  };
}
