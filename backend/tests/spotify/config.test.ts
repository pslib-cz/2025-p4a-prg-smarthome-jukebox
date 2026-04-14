import { describe, expect, it } from "vitest";
import { createSpotifyHealthSnapshot } from "../../src/spotify/config.js";

describe("createSpotifyHealthSnapshot", () => {
  it("returns a disabled snapshot when spotify is not configured", () => {
    const snapshot = createSpotifyHealthSnapshot(
      {
        clientId: null,
        redirectUri: null,
        frontendRedirectUri: null,
        scopes: ["streaming"],
        mockMode: null,
      },
      "2026-04-13T20:55:00.000Z",
    );

    expect(snapshot).toEqual({
      status: "disabled",
      reason: "Spotify web playback is not configured.",
      lastChangedAt: "2026-04-13T20:55:00.000Z",
      configured: false,
      clientIdConfigured: false,
      redirectUri: null,
      frontendRedirectUri: null,
      scopes: ["streaming"],
    });
  });

  it("returns a ready snapshot for a valid loopback configuration", () => {
    const snapshot = createSpotifyHealthSnapshot(
      {
        clientId: "spotify-client-id",
        redirectUri: "http://127.0.0.1:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/spotify/return",
        scopes: ["streaming", "user-read-private"],
        mockMode: null,
      },
      "2026-04-13T20:55:00.000Z",
    );

    expect(snapshot.status).toBe("ready");
    expect(snapshot.reason).toBeNull();
    expect(snapshot.configured).toBe(true);
    expect(snapshot.clientIdConfigured).toBe(true);
  });

  it("returns a degraded snapshot for a localhost spotify redirect uri", () => {
    const snapshot = createSpotifyHealthSnapshot(
      {
        clientId: "spotify-client-id",
        redirectUri: "http://localhost:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/spotify/return",
        scopes: ["streaming"],
        mockMode: null,
      },
      "2026-04-13T20:55:00.000Z",
    );

    expect(snapshot.status).toBe("degraded");
    expect(snapshot.configured).toBe(false);
    expect(snapshot.reason).toContain(
      "HAJUKEBOX_SPOTIFY_REDIRECT_URI must use 127.0.0.1 instead of localhost",
    );
  });

  it("returns a degraded snapshot for partial spotify configuration", () => {
    const snapshot = createSpotifyHealthSnapshot(
      {
        clientId: "spotify-client-id",
        redirectUri: null,
        frontendRedirectUri: null,
        scopes: ["streaming"],
        mockMode: null,
      },
      "2026-04-13T20:55:00.000Z",
    );

    expect(snapshot.status).toBe("degraded");
    expect(snapshot.reason).toContain(
      "missing HAJUKEBOX_SPOTIFY_REDIRECT_URI",
    );
    expect(snapshot.reason).toContain(
      "missing HAJUKEBOX_SPOTIFY_FRONTEND_REDIRECT_URI",
    );
  });
});
