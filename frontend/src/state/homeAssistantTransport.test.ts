import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createHomeAssistantTransport,
  readHomeAssistantTransportConfig,
  type HomeAssistantTransportConfig,
} from "./homeAssistantTransport";

const fetchMock = vi.fn<typeof fetch>();

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];

  readonly url: string;
  readonly sent: string[] = [];
  private readonly listeners = new Map<
    string,
    Set<(event: { data?: string }) => void>
  >();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: (event: { data?: string }) => void) {
    const listeners = this.listeners.get(type) ?? new Set();
    listeners.add(listener);
    this.listeners.set(type, listeners);
  }

  removeEventListener(
    type: string,
    listener: (event: { data?: string }) => void,
  ) {
    this.listeners.get(type)?.delete(listener);
  }

  send(data: string) {
    this.sent.push(data);
  }

  close() {
    this.emit("close", {});
  }

  receive(payload: unknown) {
    this.emit("message", { data: JSON.stringify(payload) });
  }

  emit(type: string, event: { data?: string }) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }
}

const BASE_CONFIG: HomeAssistantTransportConfig = {
  baseUrl: "http://127.0.0.1:8123",
  token: "test-token",
  websocketUrl: "ws://127.0.0.1:8123/api/websocket",
  logbookHours: 2,
  eventLogLimit: 8,
  trackedEntityIds: [
    "sensor.hajukebox_distance_cm",
    "input_select.hajukebox_mode",
  ],
};

describe("readHomeAssistantTransportConfig", () => {
  it("returns null when required frontend HA env is missing", () => {
    expect(readHomeAssistantTransportConfig({})).toBeNull();
  });

  it("builds a config from Vite env values", () => {
    const config = readHomeAssistantTransportConfig({
      VITE_HA_BASE_URL: "http://127.0.0.1:8123/",
      VITE_HA_TOKEN: "secret-token",
      VITE_HA_LOGBOOK_HOURS: "3",
      VITE_HA_EVENT_LOG_LIMIT: "5",
    });

    expect(config).toMatchObject({
      baseUrl: "http://127.0.0.1:8123",
      token: "secret-token",
      websocketUrl: "ws://127.0.0.1:8123/api/websocket",
      logbookHours: 3,
      eventLogLimit: 5,
    });
  });
});

describe("homeAssistantTransport", () => {
  afterEach(() => {
    fetchMock.mockReset();
    FakeWebSocket.instances = [];
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("loads tracked HA entities and recent logbook entries", async () => {
    fetchMock
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              entity_id: "sensor.hajukebox_distance_cm",
              state: "31",
              attributes: { friendly_name: "Distance" },
            },
            {
              entity_id: "input_select.hajukebox_mode",
              state: "Focus",
            },
            {
              entity_id: "sensor.unrelated",
              state: "ignore",
            },
          ]),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              entity_id: "sensor.hajukebox_distance_cm",
              name: "Distance",
              message: "changed to 31",
              when: "2026-04-14T09:31:00Z",
            },
            {
              entity_id: "sensor.unrelated",
              name: "Ignored",
              message: "changed to 1",
              when: "2026-04-14T09:30:00Z",
            },
          ]),
          { status: 200 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    const snapshot = await createHomeAssistantTransport(BASE_CONFIG).loadSnapshot();

    expect(snapshot.connectionStatus).toBe("connected");
    expect(snapshot.entities).toHaveLength(2);
    expect(snapshot.entities.map((entity) => entity.entity_id)).toEqual([
      "sensor.hajukebox_distance_cm",
      "input_select.hajukebox_mode",
    ]);
    expect(snapshot.eventLog).toHaveLength(1);
    expect(snapshot.eventLog?.[0]).toMatchObject({
      action: "Distance",
      meta: "changed to 31",
    });
    expect(snapshot.eventLog?.[0]?.time).toMatch(/^\d{2}:\d{2}$/u);
    expect(snapshot.mqttFeed).toEqual([]);
    expect(snapshot.automationLanes).toEqual([]);
  });

  it("sends mode changes to the HA set_mode script", async () => {
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify([{ result: "ok" }]), { status: 200 }),
    );

    vi.stubGlobal("fetch", fetchMock);

    await createHomeAssistantTransport(BASE_CONFIG).sendModeCommand("focus");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:8123/api/services/script/hajukebox_set_mode",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
        body: JSON.stringify({ mode: "focus" }),
      }),
    );
  });

  it("surfaces structured HA errors when a mode change fails", async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          message: "Mode automation is unavailable.",
        }),
        { status: 503 },
      ),
    );

    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createHomeAssistantTransport(BASE_CONFIG).sendModeCommand("party"),
    ).rejects.toThrow("Mode automation is unavailable.");
  });

  it("authenticates the HA websocket and emits tracked state updates", async () => {
    vi.stubGlobal("WebSocket", FakeWebSocket as unknown as typeof WebSocket);

    const snapshots: Array<{
      connectionStatus: string;
      entities: Array<{ entity_id: string; state: string }>;
      eventLog: Array<{ action: string; meta: string }>;
    }> = [];
    const transport = createHomeAssistantTransport(BASE_CONFIG);
    const unsubscribe = transport.subscribe?.((snapshot) => {
      snapshots.push({
        connectionStatus: snapshot.connectionStatus,
        entities: snapshot.entities.map((entity) => ({
          entity_id: entity.entity_id,
          state: entity.state,
        })),
        eventLog:
          snapshot.eventLog?.map((entry) => ({
            action: entry.action,
            meta: entry.meta,
          })) ?? [],
      });
    });

    const cleanup = await Promise.resolve(unsubscribe);

    expect(cleanup).toBeTypeOf("function");
    expect(FakeWebSocket.instances).toHaveLength(1);

    const socket = FakeWebSocket.instances[0];
    socket.receive({ type: "auth_required" });

    expect(socket.sent[0]).toBe(
      JSON.stringify({
        type: "auth",
        access_token: "test-token",
      }),
    );

    socket.receive({ type: "auth_ok" });

    expect(socket.sent[1]).toBe(
      JSON.stringify({
        id: 1,
        type: "get_states",
      }),
    );
    expect(socket.sent[2]).toBe(
      JSON.stringify({
        id: 2,
        type: "subscribe_events",
        event_type: "state_changed",
      }),
    );

    socket.receive({
      id: 1,
      type: "result",
      success: true,
      result: [
        {
          entity_id: "sensor.hajukebox_distance_cm",
          state: "31",
        },
      ],
    });

    socket.receive({
      id: 2,
      type: "event",
      event: {
        time_fired: "2026-04-14T10:12:00Z",
        data: {
          entity_id: "sensor.hajukebox_distance_cm",
          old_state: {
            entity_id: "sensor.hajukebox_distance_cm",
            state: "31",
            attributes: {
              friendly_name: "Distance",
            },
          },
          new_state: {
            entity_id: "sensor.hajukebox_distance_cm",
            state: "29",
            attributes: {
              friendly_name: "Distance",
            },
          },
        },
      },
    });

    expect(snapshots.at(-1)).toEqual({
      connectionStatus: "connected",
      entities: [
        {
          entity_id: "sensor.hajukebox_distance_cm",
          state: "29",
        },
      ],
      eventLog: [
        {
          action: "Distance",
          meta: "31 -> 29",
        },
      ],
    });

    cleanup?.();
  });
});
