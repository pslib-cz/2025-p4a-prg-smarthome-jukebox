import http from "node:http";
import { WebSocketServer } from "ws";

const host = process.env.FAKE_HA_HOST ?? "127.0.0.1";
const port = Number.parseInt(process.env.FAKE_HA_PORT ?? "8123", 10);
const token = process.env.FAKE_HA_TOKEN ?? "test-token";

const states = [
  {
    entity_id: "sensor.hajukebox_distance_cm",
    state: "37",
    attributes: { friendly_name: "Distance" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "sensor.hajukebox_presence_confidence",
    state: "91",
    attributes: { friendly_name: "Presence confidence" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "sensor.hajukebox_presence_reason",
    state: "Mobile beacon + distance lock",
    attributes: { friendly_name: "Presence reason" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "sensor.hajukebox_clap_count_today",
    state: "15",
    attributes: { friendly_name: "Clap count" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "input_text.hajukebox_last_voice_source",
    state: "Google Assistant",
    attributes: { friendly_name: "Last voice source" },
    last_changed: "2026-04-14T08:04:00Z",
    last_updated: "2026-04-14T08:04:00Z",
  },
  {
    entity_id: "input_text.hajukebox_last_voice_command",
    state: "Play music",
    attributes: { friendly_name: "Last voice command" },
    last_changed: "2026-04-14T08:04:00Z",
    last_updated: "2026-04-14T08:04:00Z",
  },
  {
    entity_id: "input_text.hajukebox_last_voice_response",
    state: "Starting local playback",
    attributes: { friendly_name: "Last voice response" },
    last_changed: "2026-04-14T08:04:00Z",
    last_updated: "2026-04-14T08:04:00Z",
  },
  {
    entity_id: "sensor.hajukebox_esp32_rssi",
    state: "-58",
    attributes: { friendly_name: "ESP32 RSSI" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "sensor.hajukebox_broker_latency_ms",
    state: "16",
    attributes: { friendly_name: "Broker latency" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "sensor.hajukebox_uptime",
    state: "14 h 03 m",
    attributes: { friendly_name: "Uptime" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "binary_sensor.hajukebox_mqtt_connected",
    state: "on",
    attributes: {
      friendly_name: "MQTT connected",
      security: "Secured (TLS)",
    },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
  {
    entity_id: "input_select.hajukebox_mode",
    state: "Focus armed",
    attributes: { friendly_name: "Mode" },
    last_changed: "2026-04-14T08:00:00Z",
    last_updated: "2026-04-14T08:00:00Z",
  },
];

const logbook = [
  {
    entity_id: "sensor.hajukebox_distance_cm",
    name: "Distance",
    message: "changed to 37",
    when: "2026-04-14T08:02:00Z",
  },
  {
    entity_id: "input_select.hajukebox_mode",
    name: "Mode",
    message: "changed to Focus armed",
    when: "2026-04-14T08:03:00Z",
  },
];

function isAuthorized(request) {
  return request.headers.authorization === `Bearer ${token}`;
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  });
  response.end(JSON.stringify(payload));
}

function findState(entityId) {
  return states.find((state) => state.entity_id === entityId) ?? null;
}

const server = http.createServer((request, response) => {
  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
    });
    response.end();
    return;
  }

  if (!isAuthorized(request)) {
    sendJson(response, 401, { message: "Unauthorized" });
    return;
  }

  if (request.url?.startsWith("/api/states")) {
    sendJson(response, 200, states);
    return;
  }

  if (request.url?.startsWith("/api/logbook")) {
    sendJson(response, 200, logbook);
    return;
  }

  if (request.url === "/api/" || request.url === "/api") {
    sendJson(response, 200, { message: "API running." });
    return;
  }

  sendJson(response, 404, { message: "Not found" });
});

const wss = new WebSocketServer({ noServer: true });

wss.on("connection", (socket) => {
  socket.send(JSON.stringify({ type: "auth_required", ha_version: "2026.4.0" }));

  socket.on("message", (rawMessage) => {
    const message = JSON.parse(rawMessage.toString());

    if (message.type === "auth") {
      if (message.access_token !== token) {
        socket.send(
          JSON.stringify({
            type: "auth_invalid",
            message: "Invalid access token",
          }),
        );
        socket.close();
        return;
      }

      socket.send(JSON.stringify({ type: "auth_ok", ha_version: "2026.4.0" }));
      return;
    }

    if (message.type === "get_states") {
      socket.send(
        JSON.stringify({
          id: message.id,
          type: "result",
          success: true,
          result: states,
        }),
      );
      return;
    }

    if (message.type === "subscribe_events") {
      socket.send(
        JSON.stringify({
          id: message.id,
          type: "result",
          success: true,
          result: null,
        }),
      );

      const previousState = findState("sensor.hajukebox_distance_cm");
      const nextState = {
        ...previousState,
        state: "31",
        last_changed: "2026-04-14T08:05:00Z",
        last_updated: "2026-04-14T08:05:00Z",
      };

      setTimeout(() => {
        const index = states.findIndex(
          (state) => state.entity_id === "sensor.hajukebox_distance_cm",
        );
        states[index] = nextState;

        socket.send(
          JSON.stringify({
            id: message.id,
            type: "event",
            event: {
              event_type: "state_changed",
              time_fired: "2026-04-14T08:05:00Z",
              data: {
                entity_id: "sensor.hajukebox_distance_cm",
                old_state: previousState,
                new_state: nextState,
              },
            },
          }),
        );
      }, 1200);
    }
  });
});

server.on("upgrade", (request, socket, head) => {
  if (request.url !== "/api/websocket") {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (websocket) => {
    wss.emit("connection", websocket, request);
  });
});

server.listen(port, host, () => {
  console.log(`Fake Home Assistant listening on http://${host}:${port}`);
});

function shutdown() {
  wss.close(() => {
    server.close(() => {
      process.exit(0);
    });
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
