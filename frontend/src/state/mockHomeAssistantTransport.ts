import { mockJukeboxState } from "./mockJukeboxState";
import {
  DEFAULT_HA_ENTITY_MAP,
  type HomeAssistantEntityState,
  type HomeAssistantTelemetrySnapshot,
  type HomeAssistantTelemetryTransport,
} from "./remoteContracts";

function buildMockEntityStates(): HomeAssistantEntityState[] {
  return [
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.distanceCm,
      state: String(mockJukeboxState.telemetry.presence.distanceCm),
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.presenceConfidence,
      state: String(mockJukeboxState.telemetry.presence.confidencePercent),
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.presenceReason,
      state: mockJukeboxState.telemetry.presence.reason,
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.clapCountToday,
      state: String(mockJukeboxState.telemetry.presence.clapCountToday),
      last_updated: new Date().toISOString(),
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.esp32Rssi,
      state: "-65",
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.brokerLatencyMs,
      state: "18",
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.uptime,
      state: mockJukeboxState.telemetry.system.uptime,
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.mqttConnected,
      state: "on",
      attributes: {
        security: mockJukeboxState.telemetry.system.mqttSecurity,
      },
    },
    {
      entity_id: DEFAULT_HA_ENTITY_MAP.mode,
      state: mockJukeboxState.telemetry.presence.lastMode,
    },
  ];
}

export function createMockHomeAssistantTransport(): HomeAssistantTelemetryTransport {
  return {
    async loadSnapshot(): Promise<HomeAssistantTelemetrySnapshot> {
      return {
        connectionStatus: "connected",
        entities: buildMockEntityStates(),
        mqttFeed: mockJukeboxState.telemetry.mqttFeed,
        eventLog: mockJukeboxState.telemetry.eventLog,
        automationLanes: mockJukeboxState.telemetry.automationLanes,
        receivedAt: new Date().toISOString(),
      };
    },
  };
}
