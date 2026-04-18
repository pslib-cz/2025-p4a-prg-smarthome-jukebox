import type { FastifyInstance } from "fastify";
import { afterEach, describe, expect, it } from "vitest";
import { buildApp } from "../../src/app.js";
import type { HomeAssistantBridgePublisher } from "../../src/homeassistant/mediaBridge.js";
import {
  spotifyDeviceMissing,
  spotifyInvalidRequest,
  spotifyNotAuthenticated,
} from "../../src/spotify/errors.js";
import type {
  SpotifyCatalogPlaylistPage,
  SpotifyCatalogTrackPage,
  SpotifyDisconnectResponse,
  SpotifyPlaybackStateSummary,
  SpotifyService,
  SpotifyStartPlaybackRequestBody,
  SpotifySessionSummary,
  SpotifyTokenPayload,
  SpotifyTransferRequestBody,
} from "../../src/spotify/types.js";
let app: FastifyInstance | null = null;
const SPOTIFY_SEARCH_RESULTS: SpotifyCatalogTrackPage = {
  items: [
    {
      id: "spotify-track-1",
      uri: "spotify:track:spotify-track-1",
      title: "Satellite Hearts",
      artist: "Signal Arcade",
      album: "Browser Playback",
      durationMs: 215_000,
      coverUrl: "/covers/midnight-groove.png",
      externalUrl: "https://open.spotify.com/track/spotify-track-1",
    },
  ],
  total: 1,
  limit: 8,
  offset: 0,
};
const SPOTIFY_PLAYLISTS: SpotifyCatalogPlaylistPage = {
  items: [
    {
      id: "spotify-playlist-1",
      uri: "spotify:playlist:spotify-playlist-1",
      name: "Late Focus",
      description: "Private focus rotation",
      ownerName: "jiri",
      imageUrl: "/covers/midnight-groove.png",
      trackCount: 12,
      externalUrl: "https://open.spotify.com/playlist/spotify-playlist-1",
    },
  ],
  total: 1,
  limit: 8,
  offset: 0,
};
function createSpotifyServiceStub(): SpotifyService {
  return {
    getHealthSnapshot() {
      return {
        status: "ready",
        reason: null,
        lastChangedAt: "2026-04-13T21:30:00.000Z",
        configured: true,
        clientIdConfigured: true,
        redirectUri: "http://127.0.0.1:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/",
        scopes: ["streaming"],
      };
    },
    async startLogin(_request, reply) {
      reply.redirect("https://accounts.spotify.com/authorize?client_id=stub");
    },
    async handleCallback(_request, reply) {
      reply.redirect("http://127.0.0.1:5173/");
    },
    async getSessionSummary(): Promise<SpotifySessionSummary> {
      return {
        configured: true,
        authenticated: false,
        authStatus: "disconnected",
        accountTier: "unknown",
        expiresAt: null,
        scopes: ["streaming"],
        lastError: null,
        mockMode: null,
      };
    },
    async getAccessTokenPayload(): Promise<SpotifyTokenPayload> {
      throw spotifyNotAuthenticated();
    },
    async getPlaybackState(): Promise<SpotifyPlaybackStateSummary> {
      return {
        authenticated: false,
        sdkStatus: null,
        transferStatus: "idle",
        deviceId: null,
        deviceName: null,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        currentTrack: null,
        lastError: null,
        mockMode: null,
      };
    },
    async searchTracks() {
      return SPOTIFY_SEARCH_RESULTS;
    },
    async getCurrentUserPlaylists() {
      return SPOTIFY_PLAYLISTS;
    },
    async getPlaylistItems() {
      return SPOTIFY_SEARCH_RESULTS;
    },
    async startPlayback(_request, payload: SpotifyStartPlaybackRequestBody) {
      if (!payload.uris?.[0]) {
        throw spotifyInvalidRequest("Spotify playback requires a track URI.");
      }

      return {
        authenticated: true,
        sdkStatus: "ready",
        transferStatus: "active",
        deviceId: payload.deviceId ?? "spotify-web-player-1",
        deviceName: "HAJukeBox Web Player",
        isActiveDevice: true,
        isPlaying: true,
        positionMs: 0,
        durationMs: 215_000,
        currentTrack: {
          id: "spotify-track-1",
          title: "Satellite Hearts",
          artist: "Signal Arcade",
          album: "Browser Playback",
          durationMs: 215_000,
          coverUrl: "/covers/midnight-groove.png",
        },
        lastError: null,
        mockMode: null,
      };
    },
    async transferPlayback(_request, payload: SpotifyTransferRequestBody) {
      if (!payload.deviceId) {
        throw spotifyDeviceMissing();
      }

      return {
        authenticated: true,
        sdkStatus: "ready",
        transferStatus: "active",
        deviceId: payload.deviceId,
        deviceName: payload.deviceName ?? "HAJukeBox Web Player",
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
          coverUrl: "/covers/midnight-groove.png",
        },
        lastError: null,
        mockMode: null,
      };
    },
    async disconnect(_request, _reply): Promise<SpotifyDisconnectResponse> {
      return { ok: true };
    },
  };
}
function createHomeAssistantBridgeSpy() {
  const updates: Array<{
    spotify: unknown;
  }> = [];

  const publisher: HomeAssistantBridgePublisher = {
    async publishStartup() {},
    async publishMediaUpdate(_mediaState, _event, spotify) {
      updates.push({
        spotify: spotify ?? null,
      });
    },
    getHealthSnapshot() {
      return {
        status: "ready",
        reason: null,
        lastChangedAt: "2026-04-14T08:00:00.000Z",
        configured: true,
        brokerUrl: "mqtt://127.0.0.1:1883",
        topicPrefix: "jukebox",
        lastSuccessfulPublishAt: "2026-04-14T08:00:00.000Z",
      };
    },
    async close() {},
  };

  return { publisher, updates };
}
function createConnectedSpotifyServiceStub(): SpotifyService {
  return {
    getHealthSnapshot() {
      return {
        status: "ready",
        reason: null,
        lastChangedAt: "2026-04-14T08:00:00.000Z",
        configured: true,
        clientIdConfigured: true,
        redirectUri: "http://127.0.0.1:3000/auth/spotify/callback",
        frontendRedirectUri: "http://127.0.0.1:5173/",
        scopes: ["streaming"],
      };
    },
    async startLogin(_request, reply) {
      reply.redirect("https://accounts.spotify.com/authorize?client_id=stub");
    },
    async handleCallback(_request, reply) {
      reply.redirect("http://127.0.0.1:5173/");
    },
    async getSessionSummary(): Promise<SpotifySessionSummary> {
      return {
        configured: true,
        authenticated: true,
        authStatus: "connected",
        accountTier: "premium",
        expiresAt: "2026-04-14T09:00:00.000Z",
        scopes: ["streaming"],
        lastError: null,
        mockMode: null,
      };
    },
    async getAccessTokenPayload(): Promise<SpotifyTokenPayload> {
      return {
        accessToken: "spotify-access-token",
        expiresAt: "2026-04-14T09:00:00.000Z",
        tokenType: "Bearer",
      };
    },
    async getPlaybackState(): Promise<SpotifyPlaybackStateSummary> {
      return {
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
          coverUrl: "/covers/midnight-groove.png",
        },
        lastError: null,
        mockMode: null,
      };
    },
    async searchTracks() {
      return SPOTIFY_SEARCH_RESULTS;
    },
    async getCurrentUserPlaylists() {
      return SPOTIFY_PLAYLISTS;
    },
    async getPlaylistItems() {
      return SPOTIFY_SEARCH_RESULTS;
    },
    async startPlayback(_request, payload: SpotifyStartPlaybackRequestBody) {
      return {
        authenticated: true,
        sdkStatus: "ready",
        transferStatus: "active",
        deviceId: payload.deviceId ?? "spotify-web-player-1",
        deviceName: "HAJukeBox Web Player",
        isActiveDevice: true,
        isPlaying: true,
        positionMs: 0,
        durationMs: 215_000,
        currentTrack: {
          id: "spotify-track-1",
          title: "Satellite Hearts",
          artist: "Signal Arcade",
          album: "Browser Playback",
          durationMs: 215_000,
          coverUrl: "/covers/midnight-groove.png",
        },
        lastError: null,
        mockMode: null,
      };
    },
    async transferPlayback(_request, payload: SpotifyTransferRequestBody) {
      if (!payload.deviceId) {
        throw spotifyDeviceMissing();
      }

      return {
        authenticated: true,
        sdkStatus: "ready",
        transferStatus: "active",
        deviceId: payload.deviceId,
        deviceName: payload.deviceName ?? "HAJukeBox Web Player",
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
          coverUrl: "/covers/midnight-groove.png",
        },
        lastError: null,
        mockMode: null,
      };
    },
    async disconnect(_request, _reply): Promise<SpotifyDisconnectResponse> {
      return { ok: true };
    },
  };
}
afterEach(async () => {
  if (app) {
    await app.close();
    app = null;
  }
});
describe("spotify routes", () => {
  it("redirects login requests to spotify accounts", async () => {
    app = buildApp({ logger: false }, null, null, createSpotifyServiceStub());

    const response = await app.inject({
      method: "GET",
      url: "/auth/spotify/login",
    });

    expect(response.statusCode).toBe(302);
    expect(response.headers["cache-control"]).toBe("no-store");
    expect(response.headers.location).toContain("accounts.spotify.com/authorize");
  }, 15_000);

  it("returns an explicit signed-out spotify session summary", async () => {
    app = buildApp({ logger: false }, null, null, createSpotifyServiceStub());

    const response = await app.inject({
      method: "GET",
      url: "/api/spotify/session",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.configured).toBe(true);
    expect(body.authenticated).toBe(false);
    expect(body.authStatus).toBe("disconnected");
  });

  it("rejects token broker requests when spotify is unauthenticated", async () => {
    app = buildApp({ logger: false }, null, null, createSpotifyServiceStub());

    const response = await app.inject({
      method: "GET",
      url: "/api/spotify/token",
    });
    const body = response.json();

    expect(response.statusCode).toBe(401);
    expect(body.error.code).toBe("spotify_not_authenticated");
  });

  it("returns spotify search results for the browser catalog", async () => {
    app = buildApp({ logger: false }, null, null, createConnectedSpotifyServiceStub());

    const response = await app.inject({
      method: "GET",
      url: "/api/spotify/search?query=satellite&limit=8&offset=0",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe("Satellite Hearts");
  });

  it("returns the authenticated user's spotify playlists", async () => {
    app = buildApp({ logger: false }, null, null, createConnectedSpotifyServiceStub());

    const response = await app.inject({
      method: "GET",
      url: "/api/spotify/playlists?limit=8",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].name).toBe("Late Focus");
  });

  it("starts spotify playback from a clicked track and mirrors the update to HA", async () => {
    const bridgeSpy = createHomeAssistantBridgeSpy();
    app = buildApp(
      { logger: false },
      null,
      bridgeSpy.publisher,
      createConnectedSpotifyServiceStub(),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/spotify/play",
      payload: {
        deviceId: "spotify-web-player-1",
        uris: ["spotify:track:spotify-track-1"],
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.isPlaying).toBe(true);
    expect(body.deviceId).toBe("spotify-web-player-1");
    expect(bridgeSpy.updates).toHaveLength(1);
    expect(bridgeSpy.updates[0].spotify).toMatchObject({
      playback: {
        isPlaying: true,
      },
    });
  });

  it("transfers spotify playback to a browser device", async () => {
    app = buildApp({ logger: false }, null, null, createSpotifyServiceStub());

    const response = await app.inject({
      method: "POST",
      url: "/api/spotify/transfer",
      payload: {
        deviceId: "spotify-web-player-1",
        deviceName: "HAJukeBox Web Player",
      },
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.transferStatus).toBe("active");
    expect(body.deviceId).toBe("spotify-web-player-1");
  });

  it("publishes spotify mirror state to the HA bridge after transfer", async () => {
    const bridgeSpy = createHomeAssistantBridgeSpy();
    app = buildApp(
      { logger: false },
      null,
      bridgeSpy.publisher,
      createConnectedSpotifyServiceStub(),
    );

    const response = await app.inject({
      method: "POST",
      url: "/api/spotify/transfer",
      payload: {
        deviceId: "spotify-web-player-1",
        deviceName: "HAJukeBox Web Player",
      },
    });

    expect(response.statusCode).toBe(200);
    expect(bridgeSpy.updates).toHaveLength(1);
    expect(bridgeSpy.updates[0].spotify).toMatchObject({
      session: {
        authenticated: true,
        authStatus: "connected",
      },
      playback: {
        transferStatus: "active",
        isActiveDevice: true,
        currentTrack: {
          title: "Satellite Hearts",
        },
      },
    });
  });

  it("clears the spotify session", async () => {
    app = buildApp({ logger: false }, null, null, createSpotifyServiceStub());

    const response = await app.inject({
      method: "POST",
      url: "/api/spotify/disconnect",
    });
    const body = response.json();

    expect(response.statusCode).toBe(200);
    expect(body.ok).toBe(true);
  });
});
