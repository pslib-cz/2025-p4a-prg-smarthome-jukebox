import { describe, expect, it } from "vitest";
import {
  buildConfig,
  normalizeMediaLibraryPath,
} from "../../src/config/env.js";

describe("buildConfig", () => {
  it("uses the default host and port when env is missing", () => {
    expect(buildConfig({} as NodeJS.ProcessEnv)).toEqual({
      host: "0.0.0.0",
      port: 3000,
      mediaLibraryPath: null,
      mqtt: {
        brokerUrl: null,
        username: null,
        password: null,
        clientId: "hajukebox-backend",
        topicPrefix: "jukebox",
      },
      spotify: {
        clientId: null,
        redirectUri: null,
        frontendRedirectUri: null,
        scopes: [
          "streaming",
          "user-read-private",
          "user-read-playback-state",
          "user-modify-playback-state",
          "playlist-read-private",
        ],
        mockMode: null,
      },
    });
  });

  it("accepts a custom host and port from env", () => {
    expect(
      buildConfig({
        HAJUKEBOX_HOST: "127.0.0.1",
        HAJUKEBOX_PORT: "4123",
        HAJUKEBOX_MQTT_BROKER_URL: "mqtt://localhost:1883",
        HAJUKEBOX_MQTT_USERNAME: "jukebox",
        HAJUKEBOX_MQTT_PASSWORD: "secret",
        HAJUKEBOX_MQTT_CLIENT_ID: "jukebox-backend-dev",
        HAJUKEBOX_MQTT_TOPIC_PREFIX: "demo/jukebox",
        HAJUKEBOX_SPOTIFY_CLIENT_ID: "spotify-client-id",
        HAJUKEBOX_SPOTIFY_REDIRECT_URI:
          "http://127.0.0.1:3000/auth/spotify/callback",
        HAJUKEBOX_SPOTIFY_FRONTEND_REDIRECT_URI:
          "http://127.0.0.1:5173/spotify/return",
        HAJUKEBOX_SPOTIFY_SCOPES: "streaming,playlist-read-private",
        HAJUKEBOX_SPOTIFY_MOCK_MODE: "active",
      }),
    ).toEqual({
      host: "127.0.0.1",
      port: 4123,
      mediaLibraryPath: null,
      mqtt: {
        brokerUrl: "mqtt://localhost:1883",
        username: "jukebox",
        password: "secret",
        clientId: "jukebox-backend-dev",
        topicPrefix: "demo/jukebox",
      },
      spotify: {
        clientId: "spotify-client-id",
        redirectUri: "http://127.0.0.1:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/spotify/return",
        scopes: ["streaming", "playlist-read-private"],
        mockMode: "active",
      },
    });
  });

  it("throws when the port is invalid", () => {
    expect(() =>
      buildConfig({
        HAJUKEBOX_PORT: "70000",
      }),
    ).toThrowError("Invalid HAJUKEBOX_PORT: 70000");
  });

  it("deduplicates spotify scopes and falls back to defaults when blank", () => {
    expect(
      buildConfig({
        HAJUKEBOX_SPOTIFY_SCOPES: "streaming streaming   user-read-private",
      }),
    ).toMatchObject({
      spotify: {
        scopes: ["streaming", "user-read-private"],
        mockMode: null,
      },
    });

    expect(
      buildConfig({
        HAJUKEBOX_SPOTIFY_SCOPES: "   ",
      }),
    ).toMatchObject({
      spotify: {
        scopes: [
          "streaming",
          "user-read-private",
          "user-read-playback-state",
          "user-modify-playback-state",
          "playlist-read-private",
        ],
        mockMode: null,
      },
    });
  });

  it("normalizes a Windows media path for WSL-style Linux mounts", () => {
    expect(
      normalizeMediaLibraryPath("C:\\Users\\jiri\\Music", "linux"),
    ).toBe("/mnt/c/Users/jiri/Music");
  });
});
