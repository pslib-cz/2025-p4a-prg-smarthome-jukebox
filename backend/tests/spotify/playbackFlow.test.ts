import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildApp } from "../../src/app.js";

let app: FastifyInstance | null = null;

function createSpotifyConfig(overrides: Partial<Parameters<typeof buildApp>[3]> = {}) {
  return {
    clientId: "spotify-client-id",
    redirectUri: "http://127.0.0.1:3000/auth/spotify/callback",
    frontendRedirectUri: "http://127.0.0.1:5173/spotify/return",
    scopes: [
      "streaming",
      "user-read-private",
      "user-read-playback-state",
      "user-modify-playback-state",
      "playlist-read-private",
    ],
    mockMode: null,
    ...overrides,
  };
}

function createJsonResponse(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
    ...init,
  });
}

function getCookieHeader(setCookie: string | string[] | undefined) {
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;

  if (!raw) {
    throw new Error("Expected a session cookie.");
  }

  return raw.split(";", 1)[0];
}

async function startSpotifyLogin() {
  const response = await app!.inject({
    method: "GET",
    url: "/auth/spotify/login",
  });
  const redirectUrl = new URL(String(response.headers.location));
  const state = redirectUrl.searchParams.get("state");

  if (!state) {
    throw new Error("Expected Spotify login state.");
  }

  return {
    cookie: getCookieHeader(response.headers["set-cookie"]),
    state,
  };
}

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }

  vi.restoreAllMocks();
});

describe("spotify playback flow", () => {
  it("keeps the session connected when a playback request fails on a missing device", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: "spotify-access-token-1",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "spotify-refresh-token-1",
          scope:
            "streaming user-read-private user-read-playback-state user-modify-playback-state playlist-read-private",
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ product: "premium" }))
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              status: 404,
              message: "Device not found",
            },
          },
          { status: 404 },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({ logger: false }, null, null, createSpotifyConfig());

    const login = await startSpotifyLogin();

    await app.inject({
      method: "GET",
      url: `/auth/spotify/callback?code=spotify-auth-code-1&state=${encodeURIComponent(login.state)}`,
      headers: {
        cookie: login.cookie,
      },
    });

    const playbackResponse = await app.inject({
      method: "POST",
      url: "/api/spotify/play",
      headers: {
        cookie: login.cookie,
      },
      payload: {
        deviceId: "stale-browser-device",
        uris: ["spotify:track:track-1"],
      },
    });
    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/spotify/session",
      headers: {
        cookie: login.cookie,
      },
    });

    expect(playbackResponse.statusCode).toBe(502);
    expect(playbackResponse.json().error.message).toContain("Device not found");
    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json()).toMatchObject({
      authenticated: true,
      authStatus: "connected",
      lastError: "Device not found",
    });
  });

  it("does not leak stale browser device ids back through playback state", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: "spotify-access-token-1",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "spotify-refresh-token-1",
          scope:
            "streaming user-read-private user-read-playback-state user-modify-playback-state playlist-read-private",
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ product: "premium" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        createJsonResponse({
          is_playing: false,
          device: {
            id: "living-room-speaker",
            name: "Living Room Speaker",
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          devices: [],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({ logger: false }, null, null, createSpotifyConfig());

    const login = await startSpotifyLogin();

    await app.inject({
      method: "GET",
      url: `/auth/spotify/callback?code=spotify-auth-code-1&state=${encodeURIComponent(login.state)}`,
      headers: {
        cookie: login.cookie,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/spotify/transfer",
      headers: {
        cookie: login.cookie,
      },
      payload: {
        deviceId: "stale-browser-device",
        deviceName: "HAJukeBox Web Player",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toMatchObject({
      deviceId: null,
      transferStatus: "idle",
      isActiveDevice: false,
    });
  });

  it("transfers the browser device before starting spotify playback on it", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: "spotify-access-token-1",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "spotify-refresh-token-1",
          scope:
            "streaming user-read-private user-read-playback-state user-modify-playback-state playlist-read-private",
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ product: "premium" }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(
        createJsonResponse({
          is_playing: true,
          progress_ms: 12_000,
          device: {
            id: "spotify-web-player-1",
            is_active: true,
            name: "HAJukeBox Web Player",
          },
          item: {
            id: "track-1",
            type: "track",
            name: "Satellite Hearts",
            duration_ms: 215_000,
            album: {
              name: "Browser Playback",
              images: [{ url: "/covers/midnight-groove.png" }],
            },
            artists: [{ name: "Signal Arcade" }],
          },
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          devices: [
            {
              id: "spotify-web-player-1",
              is_active: true,
              name: "HAJukeBox Web Player",
            },
          ],
        }),
      );

    vi.stubGlobal("fetch", fetchMock);
    app = buildApp({ logger: false }, null, null, createSpotifyConfig());

    const login = await startSpotifyLogin();

    await app.inject({
      method: "GET",
      url: `/auth/spotify/callback?code=spotify-auth-code-1&state=${encodeURIComponent(login.state)}`,
      headers: {
        cookie: login.cookie,
      },
    });

    const response = await app.inject({
      method: "POST",
      url: "/api/spotify/play",
      headers: {
        cookie: login.cookie,
      },
      payload: {
        deviceId: "spotify-web-player-1",
        uris: ["spotify:track:track-1"],
      },
    });

    expect(response.statusCode).toBe(200);
    expect(fetchMock.mock.calls[2]?.[0]).toBe("https://api.spotify.com/v1/me/player");
    expect(fetchMock.mock.calls[3]?.[0]).toBe(
      "https://api.spotify.com/v1/me/player/play?device_id=spotify-web-player-1",
    );
  });
});
