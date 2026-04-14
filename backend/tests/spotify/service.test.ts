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
    ],
    mockMode: null,
    ...overrides,
  };
}

function getCookieHeader(setCookie: string | string[] | undefined) {
  const raw = Array.isArray(setCookie) ? setCookie[0] : setCookie;

  if (!raw) {
    throw new Error("Expected a session cookie.");
  }

  return raw.split(";", 1)[0];
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

function expectUrlEncodedBody(
  body: RequestInit["body"] | null | undefined,
  expected: Record<string, string>,
) {
  expect(body).toBeInstanceOf(URLSearchParams);
  const params = body as URLSearchParams;

  for (const [key, value] of Object.entries(expected)) {
    expect(params.get(key)).toBe(value);
  }
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
    response,
    cookie: getCookieHeader(response.headers["set-cookie"]),
    redirectUrl,
    state,
  };
}

afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }

  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("spotify service", () => {
  it("builds a PKCE authorize redirect and secure session cookie for https apps", async () => {
    app = buildApp(
      { logger: false },
      null,
      null,
      createSpotifyConfig({
        redirectUri: "https://jukebox.local/auth/spotify/callback",
        frontendRedirectUri: "https://jukebox.local/spotify/return",
      }),
    );

    const { response, redirectUrl } = await startSpotifyLogin();
    const setCookie = String(response.headers["set-cookie"]);

    expect(response.statusCode).toBe(302);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers.pragma).toBe("no-cache");
    expect(String(response.headers.vary)).toContain("Cookie");
    expect(`${redirectUrl.origin}${redirectUrl.pathname}`).toBe(
      "https://accounts.spotify.com/authorize",
    );
    expect(redirectUrl.searchParams.get("client_id")).toBe("spotify-client-id");
    expect(redirectUrl.searchParams.get("response_type")).toBe("code");
    expect(redirectUrl.searchParams.get("redirect_uri")).toBe(
      "https://jukebox.local/auth/spotify/callback",
    );
    expect(redirectUrl.searchParams.get("code_challenge_method")).toBe("S256");
    expect(redirectUrl.searchParams.get("scope")).toBe(
      "streaming user-read-private user-read-playback-state user-modify-playback-state",
    );
    expect(redirectUrl.searchParams.get("state")).toBeTruthy();
    expect(redirectUrl.searchParams.get("code_challenge")).toBeTruthy();
    expect(setCookie).toContain("HttpOnly");
    expect(setCookie).toContain("SameSite=Lax");
    expect(setCookie).toContain("Secure");
  });

  it("exchanges the authorization code and refreshes PKCE tokens server-side", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-14T08:00:00.000Z"));

    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: "spotify-access-token-1",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "spotify-refresh-token-1",
          scope:
            "streaming user-read-private user-read-playback-state user-modify-playback-state",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          product: "premium",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: "spotify-access-token-2",
          token_type: "Bearer",
          expires_in: 3600,
          scope:
            "streaming user-read-private user-read-playback-state user-modify-playback-state",
        }),
      );

    vi.stubGlobal("fetch", fetchMock);

    app = buildApp({ logger: false }, null, null, createSpotifyConfig());

    const login = await startSpotifyLogin();
    const callbackResponse = await app.inject({
      method: "GET",
      url: `/auth/spotify/callback?code=spotify-auth-code-1&state=${encodeURIComponent(login.state)}`,
      headers: {
        cookie: login.cookie,
      },
    });

    vi.setSystemTime(new Date("2026-04-14T08:59:30.000Z"));

    const tokenResponse = await app.inject({
      method: "GET",
      url: "/api/spotify/token",
      headers: {
        cookie: login.cookie,
      },
    });
    const tokenBody = tokenResponse.json();

    expect(callbackResponse.statusCode).toBe(302);
    expect(callbackResponse.headers.location).toBe(
      "http://127.0.0.1:5173/spotify/return",
    );
    expect(tokenResponse.statusCode).toBe(200);
    expect(tokenResponse.headers["cache-control"]).toBe("no-store");
    expect(tokenBody.accessToken).toBe("spotify-access-token-2");
    expect(tokenBody.tokenType).toBe("Bearer");

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://accounts.spotify.com/api/token",
    );
    expectUrlEncodedBody(fetchMock.mock.calls[0]?.[1]?.body, {
      client_id: "spotify-client-id",
      grant_type: "authorization_code",
      code: "spotify-auth-code-1",
      redirect_uri: "http://127.0.0.1:3000/auth/spotify/callback",
    });
    expect(
      (fetchMock.mock.calls[0]?.[1]?.body as URLSearchParams).get("code_verifier"),
    ).toBeTruthy();
    expect(fetchMock.mock.calls[1]?.[0]).toBe("https://api.spotify.com/v1/me");
    expect(fetchMock.mock.calls[2]?.[0]).toBe(
      "https://accounts.spotify.com/api/token",
    );
    expectUrlEncodedBody(fetchMock.mock.calls[2]?.[1]?.body, {
      client_id: "spotify-client-id",
      grant_type: "refresh_token",
      refresh_token: "spotify-refresh-token-1",
    });
  });

  it("keeps spotify state readable for free accounts and blocks the token broker", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        createJsonResponse({
          access_token: "spotify-access-token-free",
          token_type: "Bearer",
          expires_in: 3600,
          refresh_token: "spotify-refresh-token-free",
          scope:
            "streaming user-read-private user-read-playback-state user-modify-playback-state",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          product: "free",
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse(
          {
            error: {
              status: 403,
              message: "Premium required to access this resource.",
            },
          },
          {
            status: 403,
          },
        ),
      );

    vi.stubGlobal("fetch", fetchMock);

    app = buildApp({ logger: false }, null, null, createSpotifyConfig());

    const login = await startSpotifyLogin();

    await app.inject({
      method: "GET",
      url: `/auth/spotify/callback?code=spotify-auth-code-free&state=${encodeURIComponent(login.state)}`,
      headers: {
        cookie: login.cookie,
      },
    });

    const sessionResponse = await app.inject({
      method: "GET",
      url: "/api/spotify/session",
      headers: {
        cookie: login.cookie,
      },
    });
    const stateResponse = await app.inject({
      method: "GET",
      url: "/api/spotify/state",
      headers: {
        cookie: login.cookie,
      },
    });
    const tokenResponse = await app.inject({
      method: "GET",
      url: "/api/spotify/token",
      headers: {
        cookie: login.cookie,
      },
    });

    expect(sessionResponse.statusCode).toBe(200);
    expect(sessionResponse.json().accountTier).toBe("free");

    expect(stateResponse.statusCode).toBe(200);
    expect(stateResponse.json()).toMatchObject({
      authenticated: true,
      transferStatus: "idle",
      currentTrack: null,
      isPlaying: false,
    });
    expect(stateResponse.json().lastError).toContain("Premium required");

    expect(tokenResponse.statusCode).toBe(403);
    expect(tokenResponse.headers["cache-control"]).toBe("no-store");
    expect(tokenResponse.json()).toEqual({
      error: {
        code: "spotify_premium_required",
        message: "Spotify Premium is required for browser playback and playback transfer.",
      },
    });
  });
});
