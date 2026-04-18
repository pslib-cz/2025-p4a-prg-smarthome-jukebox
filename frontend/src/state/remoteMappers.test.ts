import { describe, expect, it } from "vitest";
import { mockJukeboxState } from "./mockJukeboxState";
import {
  buildJukeboxStateFromRemoteSnapshots,
  deriveConnectionStatus,
  mapBackendSnapshotToLibrary,
  mapBackendSnapshotToMedia,
  mapBackendSnapshotToSpotify,
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
        {
          entity_id: "input_text.hajukebox_last_voice_source",
          state: "Google Assistant",
        },
        {
          entity_id: "input_text.hajukebox_last_voice_command",
          state: "Play music",
          last_updated: "2026-03-24T10:14:00Z",
        },
        {
          entity_id: "input_text.hajukebox_last_voice_response",
          state: "Starting local playback",
        },
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
    expect(telemetry.voiceAssistant.source).toBe("Google Assistant");
    expect(telemetry.voiceAssistant.command).toBe("Play music");
    expect(telemetry.voiceAssistant.response).toBe("Starting local playback");
    expect(telemetry.voiceAssistant.updatedAt).toMatch(/^\d{2}:\d{2}$/u);
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

describe("mapBackendSnapshotToLibrary", () => {
  it("maps backend playlist track membership into the shared library state", () => {
    const library = mapBackendSnapshotToLibrary(
      {
        connectionStatus: "connected",
        library: {
          songs: [
            {
              id: "7",
              title: "Pulse Runner",
              artist: "Static Bloom",
              album: "Night Shift",
              duration: "03:40",
              coverUrl: "/covers/pulse-runner.jpg",
            },
            {
              id: "8",
              title: "Glassline",
              artist: "Static Bloom",
              album: "Night Shift",
              duration: "04:12",
              coverUrl: "/covers/glassline.jpg",
            },
          ],
          playlists: [
            {
              id: "11",
              name: "Focus Stack",
              songCount: 0,
              icon: "◉",
              trackIds: ["8", "7", "404"],
            },
          ],
        },
      },
      mockJukeboxState.library,
      mockJukeboxState.media.activeTrack,
    );

    expect(library.songs.map((track) => track.id)).toEqual([7, 8]);
    expect(library.playlists[0]).toMatchObject({
      id: 11,
      name: "Focus Stack",
      songCount: 3,
      trackIds: [8, 7, 404],
    });
  });

  it("deduplicates playlist track ids while preserving first-seen order", () => {
    const library = mapBackendSnapshotToLibrary(
      {
        connectionStatus: "connected",
        library: {
          playlists: [
            {
              id: 5,
              name: "Duplicate Filter",
              songCount: 1,
              trackIds: [2, "2", "3", "3", "bad"],
            },
          ],
        },
      },
      mockJukeboxState.library,
      mockJukeboxState.media.activeTrack,
    );

    expect(library.playlists[0].trackIds).toEqual([2, 3]);
  });

  it("keeps the previous library when the backend snapshot omits it", () => {
    const library = mapBackendSnapshotToLibrary(
      {
        connectionStatus: "connected",
      },
      mockJukeboxState.library,
      mockJukeboxState.media.activeTrack,
    );

    expect(library).toEqual(mockJukeboxState.library);
  });
});

describe("mapBackendSnapshotToSpotify", () => {
  it("maps backend Spotify session and playback into shared Spotify state", () => {
    const spotify = mapBackendSnapshotToSpotify(
      {
        connectionStatus: "connected",
        spotifySession: {
          configured: true,
          authenticated: true,
          authStatus: "connected",
          accountTier: "premium",
          scopes: ["streaming", "user-read-playback-state"],
          expiresAt: "2026-03-24T10:40:00Z",
        },
        spotifyPlayback: {
          authenticated: true,
          sdkStatus: "ready",
          transferStatus: "active",
          deviceId: "spotify-web-player-1",
          deviceName: "HAJukeBox Web Player",
          isActiveDevice: true,
          positionMs: 42000,
          durationMs: 215000,
          currentTrack: {
            id: "spotify:track:abc123",
            title: "Satellite Hearts",
            artist: "Signal Arcade",
            album: "Browser Playback",
            durationMs: 215000,
            coverUrl: "/covers/midnight-groove.png",
          },
        },
      },
      mockJukeboxState.spotify,
    );

    expect(spotify.configured).toBe(true);
    expect(spotify.authStatus).toBe("connected");
    expect(spotify.sdkStatus).toBe("ready");
    expect(spotify.transferStatus).toBe("active");
    expect(spotify.isActiveDevice).toBe(true);
    expect(spotify.currentTrack?.title).toBe("Satellite Hearts");
    expect(spotify.durationMs).toBe(215000);
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

  it("maps backend runtime health into the shared system state", () => {
    const nextState = buildJukeboxStateFromRemoteSnapshots(mockJukeboxState, {
      backend: {
        connectionStatus: "connected",
        health: {
          status: "degraded",
          service: "hajukebox-backend",
          timestamp: "2026-03-24T10:30:00Z",
          dependencies: {
            mediaLibrary: {
              status: "ready",
            },
            haBridge: {
              status: "disabled",
              reason: "Home Assistant MQTT bridge is not configured.",
              lastSuccessfulPublishAt: "2026-03-24T10:28:00Z",
            },
          },
        },
      },
    });

    expect(nextState.telemetry.system.backendRuntime.status).toBe("degraded");
    expect(nextState.telemetry.system.backendRuntime.haBridgeStatus).toBe(
      "disabled",
    );
    expect(nextState.telemetry.system.backendRuntime.haBridgeReason).toBe(
      "Home Assistant MQTT bridge is not configured.",
    );
    expect(
      nextState.telemetry.system.backendRuntime.lastSuccessfulPublishAt,
    ).toBe("2026-03-24T10:28:00Z");
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

  it("aligns the frontend theme with the HA mode entity", () => {
    const nextState = buildJukeboxStateFromRemoteSnapshots(mockJukeboxState, {
      ha: {
        connectionStatus: "connected",
        entities: [
          { entity_id: "input_select.hajukebox_mode", state: "Eco" },
        ],
      },
    });

    expect(nextState.telemetry.presence.lastMode).toBe("Eco");
    expect(nextState.theme).toBe("eco");
  });

  it("marks the combined system as connecting when only one side is ready", () => {
    expect(deriveConnectionStatus("connected", "connecting")).toBe("connecting");
  });

  it("marks the combined system as error when either side fails", () => {
    expect(deriveConnectionStatus("connected", "error")).toBe("error");
  });

  it("keeps local playback available when backend reports Spotify as disabled", () => {
    const nextState = buildJukeboxStateFromRemoteSnapshots(mockJukeboxState, {
      backend: {
        connectionStatus: "connected",
        media: {
          source: "local",
          spotifyConnected: false,
        },
        spotifySession: {
          configured: false,
          authenticated: false,
          authStatus: "disconnected",
          accountTier: "unknown",
        },
        spotifyPlayback: {
          authenticated: false,
          sdkStatus: "idle",
          transferStatus: "idle",
          isActiveDevice: false,
        },
      },
    });

    expect(nextState.media.source).toBe("local");
    expect(nextState.media.spotifyConnected).toBe(false);
    expect(nextState.spotify.configured).toBe(false);
  });
});
