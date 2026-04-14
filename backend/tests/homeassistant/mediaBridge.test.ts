import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  createHomeAssistantBridgePublisher,
  createHomeAssistantMediaStatePayload,
  createHomeAssistantSystemEventPayload,
  createHomeAssistantSystemHealthPayload,
} from "../../src/homeassistant/mediaBridge.js";
import { getMediaState } from "../../src/media/mockCatalog.js";

function readFixture(relativePath: string) {
  return readFileSync(new URL(relativePath, import.meta.url), "utf8");
}

describe("home assistant media bridge payloads", () => {
  it("creates a summary-oriented mirrored media payload", () => {
    const mediaState = getMediaState();
    const payload = createHomeAssistantMediaStatePayload(
      mediaState,
      "2026-04-13T10:30:00.000Z",
    );

    expect(payload).toEqual({
      source: "local",
      sourceLabel: "Local MP3",
      spotifyConnected: false,
      isPlaying: false,
      activeTrackId: 1,
      title: "Midnight Groove",
      artist: "HAJukeBox",
      album: "Local Essentials",
      progressPercent: 0,
      positionMs: 0,
      durationMs: 222_000,
      volumePercent: 72,
      availability: mediaState.availability,
      spotify: null,
      timestamp: "2026-04-13T10:30:00.000Z",
    });
  });

  it("projects active spotify playback into the mirrored HA media summary", () => {
    const mediaState = getMediaState();
    const payload = createHomeAssistantMediaStatePayload(
      mediaState,
      {
        session: {
          configured: true,
          authenticated: true,
          authStatus: "connected",
          accountTier: "premium",
          expiresAt: "2026-04-13T11:30:00.000Z",
          scopes: ["streaming"],
          lastError: null,
          mockMode: null,
        },
        playback: {
          authenticated: true,
          sdkStatus: "ready",
          transferStatus: "active",
          deviceId: "spotify-web-player-1",
          deviceName: "HAJukeBox Web Player",
          isActiveDevice: true,
          isPlaying: true,
          positionMs: 64_200,
          durationMs: 215_000,
          currentTrack: {
            id: "spotify-track-1",
            title: "Satellite Hearts",
            artist: "Signal Arcade",
            album: "Browser Playback",
            durationMs: 215_000,
            coverUrl: "https://i.scdn.co/image/example",
          },
          lastError: null,
          mockMode: null,
        },
      },
      "2026-04-13T10:30:00.000Z",
    );

    expect(payload).toMatchObject({
      source: "spotify",
      sourceLabel: "Spotify",
      spotifyConnected: true,
      isPlaying: true,
      activeTrackId: "spotify-track-1",
      title: "Satellite Hearts",
      artist: "Signal Arcade",
      album: "Browser Playback",
      positionMs: 64_200,
      durationMs: 215_000,
      volumePercent: 72,
      spotify: {
        configured: true,
        authenticated: true,
        authStatus: "connected",
        accountTier: "premium",
        sdkStatus: "ready",
        transferStatus: "active",
        deviceName: "HAJukeBox Web Player",
        trackId: "spotify-track-1",
        title: "Satellite Hearts",
      },
    });
    expect(payload.progressPercent).toBe(30);
  });

  it("marks system health as degraded when the bridge has a last error", () => {
    const mediaState = getMediaState();
    const payload = createHomeAssistantSystemHealthPayload(
      mediaState,
      "MQTT bridge is offline.",
      "2026-04-13T10:30:00.000Z",
    );

    expect(payload).toEqual({
      backendStatus: "degraded",
      libraryStatus: "ready",
      playerStatus: "ready",
      pathConfigured: false,
      trackCount: 2,
      playlistCount: 1,
      lastError: "MQTT bridge is offline.",
      timestamp: "2026-04-13T10:30:00.000Z",
    });
  });

  it("creates a mirrored backend event payload", () => {
    const payload = createHomeAssistantSystemEventPayload({
      action: "media.play",
      meta: "Playing Midnight Groove",
      level: "info",
      timestamp: "2026-04-13T10:30:00.000Z",
      source: "backend",
    });

    expect(payload).toEqual({
      action: "media.play",
      meta: "Playing Midnight Groove",
      level: "info",
      timestamp: "2026-04-13T10:30:00.000Z",
      source: "backend",
    });
  });

  it("exposes a disabled bridge health snapshot when MQTT is not configured", () => {
    const logger = {
      info() {},
      warn() {},
    } as never;
    const publisher = createHomeAssistantBridgePublisher(logger, {
      brokerUrl: null,
      username: null,
      password: null,
      clientId: "hajukebox-test",
      topicPrefix: "jukebox",
    });

    expect(publisher.getHealthSnapshot()).toEqual({
      status: "disabled",
      reason: "Home Assistant MQTT bridge is not configured.",
      lastChangedAt: expect.any(String),
      configured: false,
      brokerUrl: null,
      topicPrefix: "jukebox",
      lastSuccessfulPublishAt: null,
    });
  });

  it("defines HA MQTT entities for mirrored spotify status", () => {
    const packageYaml = readFixture(
      "../../../homeassistant/packages/jukebox_media_bridge.yaml",
    );

    expect(packageYaml).toContain("HAJukeBox Spotify Auth Status");
    expect(packageYaml).toContain("HAJukeBox Spotify Account Tier");
    expect(packageYaml).toContain("HAJukeBox Spotify Device");
    expect(packageYaml).toContain("HAJukeBox Spotify Transfer Status");
    expect(packageYaml).toContain("HAJukeBox Spotify Last Error");
    expect(packageYaml).toContain("HAJukeBox Spotify Authenticated");
    expect(packageYaml).toContain("HAJukeBox Spotify Active Device");
    expect(packageYaml).toContain("value_json.spotify.authStatus");
    expect(packageYaml).toContain("value_json.spotify.isActiveDevice");
  });
});
