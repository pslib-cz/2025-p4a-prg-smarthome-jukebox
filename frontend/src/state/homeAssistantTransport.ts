import type {
  HomeAssistantEntityMap,
  HomeAssistantEntityState,
  HomeAssistantTelemetrySnapshot,
  HomeAssistantTelemetryTransport,
} from "./remoteContracts";
import { DEFAULT_HA_ENTITY_MAP } from "./remoteContracts";
import type { JukeboxMode } from "./jukeboxTypes";
import type { EventLogItem } from "./jukeboxTypes";

const DEFAULT_LOGBOOK_HOURS = 6;
const DEFAULT_EVENT_LOG_LIMIT = 12;
const RECONNECT_DELAY_MS = 3_000;

interface HomeAssistantLogbookEntry {
  entity_id?: string;
  name?: string;
  message?: string;
  when?: string;
}

interface HomeAssistantStateChangedEventPayload {
  event?: {
    data?: {
      entity_id?: string;
      new_state?: HomeAssistantEntityState | null;
      old_state?: HomeAssistantEntityState | null;
    };
    time_fired?: string;
  };
}

interface HomeAssistantWsResultPayload {
  id?: number;
  type?: string;
  success?: boolean;
  result?: unknown;
  message?: string;
}

interface HomeAssistantWsAuthPayload {
  type?: string;
  message?: string;
}

export interface HomeAssistantTransportConfig {
  baseUrl: string;
  token: string;
  websocketUrl: string;
  logbookHours: number;
  eventLogLimit: number;
  trackedEntityIds: string[];
}

type HomeAssistantEnv = Record<string, string | boolean | undefined>;

function getTrimmedString(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatTime(timestamp: string | undefined) {
  if (!timestamp) {
    return "Now";
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "Now";
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function buildTrackedEntityIds(entityMap: HomeAssistantEntityMap) {
  return [...new Set(Object.values(entityMap))];
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/u, "");
}

function deriveWebSocketUrl(baseUrl: string) {
  const url = new URL(baseUrl);
  url.protocol = url.protocol === "https:" ? "wss:" : "ws:";
  url.pathname = `${url.pathname.replace(/\/+$/u, "")}/api/websocket`;
  url.search = "";
  url.hash = "";
  return url.toString();
}

function createAuthHeaders(token: string) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

async function readHomeAssistantError(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    const payload = JSON.parse(text) as { message?: string; error?: string };
    return getTrimmedString(payload.message) ?? getTrimmedString(payload.error);
  } catch {
    return getTrimmedString(text);
  }
}

async function readJson<T>(
  input: RequestInfo | URL,
  init: RequestInit | undefined,
): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const message = await readHomeAssistantError(response);
    throw new Error(
      message ?? `Home Assistant request failed: ${response.status}`,
    );
  }

  return response.json() as Promise<T>;
}

function normalizeEntityState(state: HomeAssistantEntityState) {
  return {
    entity_id: state.entity_id,
    state: typeof state.state === "string" ? state.state : String(state.state),
    attributes: state.attributes,
    last_changed: state.last_changed,
    last_updated: state.last_updated,
  } satisfies HomeAssistantEntityState;
}

function mapLogbookEntryToEvent(entry: HomeAssistantLogbookEntry): EventLogItem | null {
  const entityId = getTrimmedString(entry.entity_id);
  const message = getTrimmedString(entry.message);

  if (!entityId || !message) {
    return null;
  }

  return {
    time: formatTime(entry.when),
    action: getTrimmedString(entry.name) ?? entityId,
    meta: message,
  };
}

function trimEventLog(eventLog: EventLogItem[], limit: number) {
  return eventLog.slice(-limit);
}

function mapStateChangedEventToLogItem(
  payload: HomeAssistantStateChangedEventPayload,
): EventLogItem | null {
  const data = payload.event?.data;
  const entityId = getTrimmedString(data?.entity_id);
  const nextState = getTrimmedString(data?.new_state?.state);
  const previousState = getTrimmedString(data?.old_state?.state);

  if (!entityId || !nextState || nextState === previousState) {
    return null;
  }

  const friendlyName =
    getTrimmedString(
      data?.new_state?.attributes?.friendly_name as string | undefined,
    ) ??
    getTrimmedString(
      data?.old_state?.attributes?.friendly_name as string | undefined,
    ) ??
    entityId;

  return {
    time: formatTime(payload.event?.time_fired),
    action: friendlyName,
    meta:
      previousState !== null
        ? `${previousState} -> ${nextState}`
        : `changed to ${nextState}`,
  };
}

function parseNumber(
  value: string | boolean | undefined,
  fallback: number,
) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string") {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function createSnapshot(
  entities: HomeAssistantEntityState[],
  eventLog: EventLogItem[],
  connectionStatus: HomeAssistantTelemetrySnapshot["connectionStatus"],
  lastError: string | null,
): HomeAssistantTelemetrySnapshot {
  return {
    connectionStatus,
    entities,
    mqttFeed: [],
    eventLog,
    automationLanes: [],
    receivedAt: new Date().toISOString(),
    lastError,
  };
}

async function loadTrackedStates(
  config: HomeAssistantTransportConfig,
): Promise<HomeAssistantEntityState[]> {
  const states = await readJson<HomeAssistantEntityState[]>(
    new URL("/api/states", `${config.baseUrl}/`),
    {
      headers: createAuthHeaders(config.token),
    },
  );

  const trackedEntityIds = new Set(config.trackedEntityIds);
  return states
    .filter((state) => trackedEntityIds.has(state.entity_id))
    .map(normalizeEntityState);
}

async function loadRecentLogbook(
  config: HomeAssistantTransportConfig,
): Promise<EventLogItem[]> {
  const startTime = new Date(
    Date.now() - config.logbookHours * 60 * 60 * 1000,
  ).toISOString();
  const logbookUrl = new URL(
    `/api/logbook/${encodeURIComponent(startTime)}`,
    `${config.baseUrl}/`,
  );
  logbookUrl.searchParams.set("end_time", new Date().toISOString());

  const trackedEntityIds = new Set(config.trackedEntityIds);

  try {
    const entries = await readJson<HomeAssistantLogbookEntry[]>(
      logbookUrl,
      {
        headers: createAuthHeaders(config.token),
      },
    );

    return trimEventLog(
      entries
        .filter((entry) => trackedEntityIds.has(entry.entity_id ?? ""))
        .map(mapLogbookEntryToEvent)
        .filter((entry): entry is EventLogItem => entry !== null),
      config.eventLogLimit,
    );
  } catch {
    return [];
  }
}

export function readHomeAssistantTransportConfig(
  env: HomeAssistantEnv = import.meta.env as HomeAssistantEnv,
  entityMap: HomeAssistantEntityMap = DEFAULT_HA_ENTITY_MAP,
): HomeAssistantTransportConfig | null {
  const mode = getTrimmedString(String(env.VITE_HA_MODE ?? ""));

  if (mode === "mock") {
    return null;
  }

  const baseUrl = getTrimmedString(String(env.VITE_HA_BASE_URL ?? ""));
  const token = getTrimmedString(String(env.VITE_HA_TOKEN ?? ""));

  if (!baseUrl || !token) {
    return null;
  }

  const websocketUrl =
    getTrimmedString(String(env.VITE_HA_WEBSOCKET_URL ?? "")) ??
    deriveWebSocketUrl(baseUrl);

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    token,
    websocketUrl,
    logbookHours: parseNumber(
      typeof env.VITE_HA_LOGBOOK_HOURS === "string"
        ? env.VITE_HA_LOGBOOK_HOURS
        : undefined,
      DEFAULT_LOGBOOK_HOURS,
    ),
    eventLogLimit: parseNumber(
      typeof env.VITE_HA_EVENT_LOG_LIMIT === "string"
        ? env.VITE_HA_EVENT_LOG_LIMIT
        : undefined,
      DEFAULT_EVENT_LOG_LIMIT,
    ),
    trackedEntityIds: buildTrackedEntityIds(entityMap),
  };
}

export function createHomeAssistantTransport(
  config: HomeAssistantTransportConfig,
): HomeAssistantTelemetryTransport {
  return {
    async sendModeCommand(mode: JukeboxMode) {
      const response = await fetch(
        new URL(
          "/api/services/script/hajukebox_set_mode",
          `${config.baseUrl}/`,
        ).toString(),
        {
          method: "POST",
          headers: createAuthHeaders(config.token),
          body: JSON.stringify({ mode }),
        },
      );

      if (!response.ok) {
        const message = await readHomeAssistantError(response);
        throw new Error(
          message ?? `Home Assistant mode command failed: ${response.status}`,
        );
      }
    },

    async loadSnapshot() {
      const [entities, eventLog] = await Promise.all([
        loadTrackedStates(config),
        loadRecentLogbook(config),
      ]);

      return createSnapshot(entities, eventLog, "connected", null);
    },

    subscribe(onSnapshot) {
      let socket: WebSocket | null = null;
      let reconnectTimeoutId: number | null = null;
      let isClosed = false;
      let nextCommandId = 1;
      let lastError: string | null = null;
      const stateCache = new Map<string, HomeAssistantEntityState>();
      let eventLog: EventLogItem[] = [];
      let statesLoaded = false;

      const trackedEntityIds = new Set(config.trackedEntityIds);

      const emitSnapshot = (
        connectionStatus: HomeAssistantTelemetrySnapshot["connectionStatus"],
      ) => {
        onSnapshot(
          createSnapshot(
            [...stateCache.values()],
            eventLog,
            connectionStatus,
            lastError,
          ),
        );
      };

      const sendCommand = (payload: Record<string, unknown>) => {
        if (!socket) {
          return;
        }

        socket.send(JSON.stringify({ id: nextCommandId++, ...payload }));
      };

      const scheduleReconnect = () => {
        if (isClosed || reconnectTimeoutId !== null) {
          return;
        }

        emitSnapshot("connecting");
        reconnectTimeoutId = window.setTimeout(() => {
          reconnectTimeoutId = null;
          connect();
        }, RECONNECT_DELAY_MS);
      };

      const handleMessage = (event: MessageEvent<string>) => {
        let payload: HomeAssistantWsAuthPayload &
          HomeAssistantWsResultPayload &
          HomeAssistantStateChangedEventPayload;

        try {
          payload = JSON.parse(event.data) as typeof payload;
        } catch {
          return;
        }

        if (payload.type === "auth_required") {
          socket?.send(
            JSON.stringify({
              type: "auth",
              access_token: config.token,
            }),
          );
          return;
        }

        if (payload.type === "auth_invalid") {
          lastError = getTrimmedString(payload.message) ?? "Home Assistant authentication failed.";
          emitSnapshot("error");
          socket?.close();
          return;
        }

        if (payload.type === "auth_ok") {
          lastError = null;
          sendCommand({ type: "get_states" });
          sendCommand({
            type: "subscribe_events",
            event_type: "state_changed",
          });
          return;
        }

        if (payload.type === "result") {
          if (payload.success === false) {
            lastError =
              getTrimmedString(payload.message) ??
              "Home Assistant WebSocket command failed.";
            emitSnapshot("error");
            return;
          }

          if (
            Array.isArray(payload.result) &&
            payload.result.every(
              (item) =>
                item &&
                typeof item === "object" &&
                "entity_id" in item &&
                "state" in item,
            )
          ) {
            stateCache.clear();

            for (const item of payload.result as HomeAssistantEntityState[]) {
              if (!trackedEntityIds.has(item.entity_id)) {
                continue;
              }

              stateCache.set(item.entity_id, normalizeEntityState(item));
            }

            statesLoaded = true;
            emitSnapshot("connected");
          }

          return;
        }

        if (payload.type !== "event") {
          return;
        }

        const entityId = getTrimmedString(payload.event?.data?.entity_id);

        if (!entityId || !trackedEntityIds.has(entityId)) {
          return;
        }

        const nextState = payload.event?.data?.new_state;

        if (nextState) {
          stateCache.set(entityId, normalizeEntityState(nextState));
        } else {
          stateCache.delete(entityId);
        }

        const nextLogItem = mapStateChangedEventToLogItem(payload);
        if (nextLogItem) {
          eventLog = trimEventLog(
            [...eventLog, nextLogItem],
            config.eventLogLimit,
          );
        }

        lastError = null;
        emitSnapshot(statesLoaded ? "connected" : "connecting");
      };

      const handleClose = () => {
        socket = null;

        if (isClosed) {
          return;
        }

        scheduleReconnect();
      };

      const handleError = () => {
        lastError = "Home Assistant WebSocket connection failed.";
        emitSnapshot("error");
      };

      const connect = () => {
        socket = new WebSocket(config.websocketUrl);
        emitSnapshot("connecting");
        socket.addEventListener("message", handleMessage);
        socket.addEventListener("close", handleClose);
        socket.addEventListener("error", handleError);
      };

      connect();

      return () => {
        isClosed = true;

        if (reconnectTimeoutId !== null) {
          window.clearTimeout(reconnectTimeoutId);
        }

        socket?.removeEventListener("message", handleMessage);
        socket?.removeEventListener("close", handleClose);
        socket?.removeEventListener("error", handleError);
        socket?.close();
      };
    },
  };
}
