import { describe, expect, it } from "vitest";
import { mockJukeboxState } from "./mockJukeboxState";
import {
  buildJukeboxStateFromRemoteSnapshots,
  deriveConnectionStatus,
  mapBackendSnapshotToMedia,
  mapHomeAssistantSnapshotToTelemetry,
} from "./remoteMappers";
import type {
  BackendSnapshot,
  HomeAssistantTelemetrySnapshot,
} from "./remoteContracts";

describe("mapHomeAssistantSnapshotToTelemetry", () => {
  it("maps HA entities into telemetry state and appends live series", () => {
    const snapshot: HomeAssistantTelemetrySnapshot = {
      connectionStatus: "connected",
      receivedAt: "2026-03-24T10:15:00Z",
      entities: [
        { entity_id: "sensor.hajukebox_distance_cm", state: "37" },
        { entity_id: "sensor.hajukebox_presence_confidence", state: "91" },
        {
          entity_id: "sensor.hajukebox_presence_reason",
          state: "Mobile beacon + distance lock",
        },
        { entity_id: "sensor.hajukebox_clap_count_today", state: "15" },
        { entity_id: "sensor.hajukebox_esp32_rssi", state: "-58" },
        { entity_id: "sensor.hajukebox_broker_latency_ms", state: "16" },
        { entity_id: "sensor.hajukebox_uptime", state: "14 h 03 m" },
        {
          entity_id: "binary_sensor.hajukebox_mqtt_connected",
          state: "on",
          attributes: { security: "Secured (TLS)" },
        },
        { entity_id: "input_select.hajukebox_mode", state: "Focus armed" },
      ],
      mqttFeed: [
        {
          direction: "RECV",
          topic: "jukebox/sensors/distance",
          payload: "{\"distance_cm\":37}",
          tone: "recv",
        },
      ],
    };

    const telemetry = mapHomeAssistantSnapshotToTelemetry(
      snapshot,
      mockJukeboxState.telemetry,
    );

    expect(telemetry.presence.distanceCm).toBe(37);
    expect(telemetry.presence.confidencePercent).toBe(91);
    expect(telemetry.presence.clapCountToday).toBe(15);
    expect(telemetry.system.mqttStatus).toBe("Connected");
    expect(telemetry.distanceSeries.at(-1)?.value).toBe(37);
    expect(telemetry.clapTrace.at(-1)).toBe(100);
  });

  it("keeps previous telemetry values when HA snapshot omits entities", () => {
    const snapshot: HomeAssistantTelemetrySnapshot = {
      connectionStatus: "connected",
      entities: [],
    };

    const telemetry = mapHomeAssistantSnapshotToTelemetry(
      snapshot,
      mockJukeboxState.telemetry,
    );

    expect(telemetry.presence.distanceCm).toBe(
      mockJukeboxState.telemetry.presence.distanceCm,
    );
    expect(telemetry.system.rssiDbm).toBe(
      mockJukeboxState.telemetry.system.rssiDbm,
    );
    expect(telemetry.distanceSeries).toEqual(
      mockJukeboxState.telemetry.distanceSeries,
    );
  });

  it("falls back cleanly when HA values are malformed", () => {
    const snapshot: HomeAssistantTelemetrySnapshot = {
      connectionStatus: "connected",
      entities: [
        { entity_id: "sensor.hajukebox_distance_cm", state: "NaN" },
        { entity_id: "sensor.hajukebox_presence_confidence", state: "bad-data" },
        { entity_id: "sensor.hajukebox_clap_count_today", state: "oops" },
        {
          entity_id: "binary_sensor.hajukebox_mqtt_connected",
          state: "off",
        },
      ],
    };

    const telemetry = mapHomeAssistantSnapshotToTelemetry(
      snapshot,
      mockJukeboxState.telemetry,
    );

    expect(telemetry.presence.distanceCm).toBe(
      mockJukeboxState.telemetry.presence.distanceCm,
    );
    expect(telemetry.presence.confidencePercent).toBe(
      mockJukeboxState.telemetry.presence.confidencePercent,
    );
    expect(telemetry.system.mqttStatus).toBe("Disconnected");
    expect(telemetry.presence.clapCountToday).toBe(
      mockJukeboxState.telemetry.presence.clapCountToday,
    );
  });
});

describe("mapBackendSnapshotToMedia", () => {
  it("maps backend media state into the shared media contract", () => {
    const snapshot: BackendSnapshot = {
      connectionStatus: "connected",
      media: {
        source: "local",
        sourceLabel: "Bedroom Library",
        isPlaying: true,
        positionMs: 45000,
        durationMs: 180000,
        volumePercent: 62,
        activeTrackId: "9",
        activeTrack: {
          id: "9",
          title: "Night Shift",
          artist: "Static Bloom",
          album: "Low Light",
          duration: "3:00",
          coverUrl: "/covers/night-shift.jpg",
        },
        queue: [
          {
            id: "9",
            title: "Night Shift",
            artist: "Static Bloom",
            album: "Low Light",
            duration: "3:00",
            coverUrl: "/covers/night-shift.jpg",
          },
        ],
        audio: {
          quality: "320 kbps",
          codec: "MP3",
          bufferPercent: 81,
          dspProfile: "Flat",
        },
      },
    };

    const media = mapBackendSnapshotToMedia(snapshot, mockJukeboxState.media);

    expect(media.isPlaying).toBe(true);
    expect(media.progressPercent).toBe(25);
    expect(media.activeTrack.id).toBe(9);
    expect(media.audio.dspProfile).toBe("Flat");
    expect(media.queue).toHaveLength(1);
  });

  it("keeps previous media state when backend media payload is missing", () => {
    const snapshot: BackendSnapshot = {
      connectionStatus: "connected",
    };

    const media = mapBackendSnapshotToMedia(snapshot, mockJukeboxState.media);

    expect(media).toEqual(mockJukeboxState.media);
  });

  it("clamps malformed or out-of-range backend values", () => {
    const snapshot: BackendSnapshot = {
      connectionStatus: "connected",
      media: {
        volumePercent: 120,
        progressPercent: -20,
        activeTrack: {
          id: "bad",
          title: "",
          artist: "",
          album: "",
          duration: "",
        },
      },
    };

    const media = mapBackendSnapshotToMedia(snapshot, mockJukeboxState.media);

    expect(media.volumePercent).toBe(100);
    expect(media.progressPercent).toBe(0);
    expect(media.activeTrack.title).toBe(mockJukeboxState.media.activeTrack.title);
  });
});

describe("buildJukeboxStateFromRemoteSnapshots", () => {
  it("merges HA telemetry and backend media into one state tree", () => {
    const nextState = buildJukeboxStateFromRemoteSnapshots(mockJukeboxState, {
      ha: {
        connectionStatus: "connected",
        entities: [
          { entity_id: "sensor.hajukebox_distance_cm", state: "31" },
          {
            entity_id: "binary_sensor.hajukebox_mqtt_connected",
            state: "on",
            attributes: { security: "Secured (TLS)" },
          },
        ],
      },
      backend: {
        connectionStatus: "connected",
        media: {
          isPlaying: true,
          progressPercent: 48,
        },
      },
    });

    expect(nextState.connectionStatus).toBe("connected");
    expect(nextState.telemetry.presence.distanceCm).toBe(31);
    expect(nextState.media.isPlaying).toBe(true);
    expect(nextState.media.progressPercent).toBe(48);
  });

  it("overrides telemetry event log with backend log when backend provides it", () => {
    const nextState = buildJukeboxStateFromRemoteSnapshots(mockJukeboxState, {
      ha: {
        connectionStatus: "connected",
        entities: [],
        eventLog: [
          {
            time: "08:10",
            action: "HA event",
            meta: "HA side",
          },
        ],
      },
      backend: {
        connectionStatus: "connected",
        eventLog: [
          {
            time: "08:12",
            action: "Play",
            meta: "Track 4",
          },
        ],
      },
    });

    expect(nextState.telemetry.eventLog).toEqual([
      {
        time: "08:12",
        action: "Play",
        meta: "Track 4",
      },
    ]);
  });

  it("marks the combined system as connecting when only one side is ready", () => {
    expect(deriveConnectionStatus("connected", "connecting")).toBe("connecting");
  });

  it("marks the combined system as error when either side fails", () => {
    expect(deriveConnectionStatus("connected", "error")).toBe("error");
  });
});
