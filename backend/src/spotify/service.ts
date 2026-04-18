import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SpotifyConfig } from "../config/env.js";
import { createSpotifyHealthSnapshot } from "./config.js";
import {
  normalizeSpotifyPlaylistItems,
  normalizeSpotifyPlaylists,
  normalizeSpotifySearchTracks,
  type SpotifyCatalogPlaylistSummary,
  type SpotifyCatalogTrackSummary,
} from "./catalog.js";
import {
  isSpotifyApiError,
  spotifyDeviceMissing,
  spotifyInvalidRequest,
  spotifyInvalidState,
  spotifyMissingCode,
  spotifyNotAuthenticated,
  spotifyNotConfigured,
  spotifyPremiumRequired,
  spotifyUpstreamError,
} from "./errors.js";
import { fetchSpotifyWithBackoff } from "./http.js";
import type {
  SpotifyAccountTier,
  SpotifyCatalogPlaylistPage,
  SpotifyCatalogTrackPage,
  SpotifyDisconnectResponse,
  SpotifyMockMode,
  SpotifyPlaybackStateSummary,
  SpotifyPlaybackTrackPayload,
  SpotifySdkStatus,
  SpotifyStartPlaybackRequestBody,
  SpotifyService,
  SpotifySessionSummary,
  SpotifyTokenPayload,
  SpotifyTransferRequestBody,
} from "./types.js";

const SPOTIFY_AUTHORIZE_URL = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token";
const SPOTIFY_API_BASE_URL = "https://api.spotify.com/v1";
const SESSION_COOKIE_NAME = "hajukebox_spotify_sid";
const TOKEN_REFRESH_SKEW_MS = 60_000;
const MOCK_BROWSER_DEVICE_ID = "mock-spotify-web-player";
const MOCK_BROWSER_DEVICE_NAME = "HAJukeBox Web Player";
const MOCK_TRACK: SpotifyPlaybackTrackPayload = {
  id: "mock-track-901",
  title: "Satellite Hearts",
  artist: "Signal Arcade",
  album: "Browser Playback",
  durationMs: 215_000,
  coverUrl: "/covers/midnight-groove.png",
};
const MOCK_SPOTIFY_TRACKS: SpotifyCatalogTrackSummary[] = [
  {
    id: "mock-track-901",
    uri: "spotify:track:mock-track-901",
    title: "Satellite Hearts",
    artist: "Signal Arcade",
    album: "Browser Playback",
    durationMs: 215_000,
    coverUrl: "/covers/midnight-groove.png",
    externalUrl: "https://open.spotify.com/track/mock-track-901",
  },
  {
    id: "mock-track-902",
    uri: "spotify:track:mock-track-902",
    title: "Neon Arrival",
    artist: "Signal Arcade",
    album: "Browser Playback",
    durationMs: 198_000,
    coverUrl: "/covers/midnight-groove.png",
    externalUrl: "https://open.spotify.com/track/mock-track-902",
  },
  {
    id: "mock-track-903",
    uri: "spotify:track:mock-track-903",
    title: "Quiet Focus",
    artist: "Morning Static",
    album: "Study Lines",
    durationMs: 246_000,
    coverUrl: "/covers/midnight-groove.png",
    externalUrl: "https://open.spotify.com/track/mock-track-903",
  },
];
const MOCK_SPOTIFY_PLAYLISTS: SpotifyCatalogPlaylistSummary[] = [
  {
    id: "mock-playlist-focus",
    uri: "spotify:playlist:mock-playlist-focus",
    name: "Focus Rotation",
    description: "Mock playlist for browser playback validation.",
    ownerName: "HAJukeBox",
    imageUrl: "/covers/midnight-groove.png",
    trackCount: 3,
    externalUrl: "https://open.spotify.com/playlist/mock-playlist-focus",
  },
];
const DEFAULT_SPOTIFY_CONFIG: SpotifyConfig = {
  clientId: null,
  redirectUri: null,
  frontendRedirectUri: null,
  scopes: [],
  mockMode: null,
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  refresh_token?: string;
  scope?: string;
}

interface SpotifyProfileResponse {
  product?: string;
}

interface SpotifyPlaybackResponse {
  is_playing?: boolean;
  progress_ms?: number;
  device?: {
    id?: string;
    is_active?: boolean;
    name?: string;
  };
  item?: {
    id?: string;
    name?: string;
    duration_ms?: number;
    type?: string;
    album?: {
      name?: string;
      images?: Array<{ url?: string }>;
    };
    artists?: Array<{ name?: string }>;
  } | null;
}

interface SpotifyDevicesResponse {
  devices?: Array<{
    id?: string;
    is_active?: boolean;
    name?: string;
  }>;
}

interface SpotifySessionRecord {
  id: string;
  oauthState: string | null;
  codeVerifier: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  expiresAt: number | null;
  scopes: string[];
  accountTier: SpotifyAccountTier;
  lastError: string | null;
  browserDeviceId: string | null;
  browserDeviceName: string | null;
}

function parseCookieHeader(header: string | undefined) {
  if (!header) {
    return new Map<string, string>();
  }

  return new Map(
    header
      .split(";")
      .map((segment) => segment.trim())
      .filter((segment) => segment.length > 0)
      .map((segment) => {
        const separatorIndex = segment.indexOf("=");
        if (separatorIndex === -1) {
          return [segment, ""];
        }

        return [
          segment.slice(0, separatorIndex),
          decodeURIComponent(segment.slice(separatorIndex + 1)),
        ];
      }),
  );
}

function serializeCookie(
  name: string,
  value: string,
  options: {
    maxAge?: number;
    secure?: boolean;
  } = {},
) {
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
  ];

  if (options.secure) {
    parts.push("Secure");
  }

  if (typeof options.maxAge === "number") {
    parts.push(`Max-Age=${Math.max(0, Math.floor(options.maxAge))}`);
  }

  return parts.join("; ");
}

function appendSetCookie(reply: FastifyReply, cookie: string) {
  const current = reply.getHeader("Set-Cookie");

  if (!current) {
    reply.header("Set-Cookie", cookie);
    return;
  }

  const next = Array.isArray(current) ? [...current, cookie] : [String(current), cookie];
  reply.header("Set-Cookie", next);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return String(error);
}

async function readResponseBody(response: Response) {
  const text = await response.text();

  if (!text.trim()) {
    return null;
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return text;
  }
}

function getSpotifyUpstreamMessage(
  body: unknown,
  fallback: string,
) {
  if (!body || typeof body !== "object") {
    return fallback;
  }

  const payload = body as {
    error?: string | { message?: string };
    error_description?: string;
  };

  if (typeof payload.error_description === "string" && payload.error_description.trim()) {
    return payload.error_description.trim();
  }

  if (typeof payload.error === "string" && payload.error.trim()) {
    return payload.error.trim();
  }

  if (
    payload.error &&
    typeof payload.error === "object" &&
    typeof payload.error.message === "string" &&
    payload.error.message.trim()
  ) {
    return payload.error.message.trim();
  }

  return fallback;
}

function normalizeAccountTier(product: string | undefined): SpotifyAccountTier {
  switch (product?.trim().toLowerCase()) {
    case "premium":
      return "premium";
    case "free":
      return "free";
    default:
      return "unknown";
  }
}

function toIsoOrNull(timestamp: number | null) {
  return timestamp ? new Date(timestamp).toISOString() : null;
}

function normalizeMockMode(value: string | null): SpotifyMockMode | null {
  switch (value) {
    case "signed_out":
    case "connected":
    case "ready":
    case "active":
    case "error":
      return value;
    default:
      return null;
  }
}

function shouldUseSecureCookie(
  request: FastifyRequest,
  config: SpotifyConfig,
) {
  const forwardedProto = request.headers["x-forwarded-proto"];
  const forwardedValues =
    typeof forwardedProto === "string"
      ? forwardedProto.split(",").map((value) => value.trim().toLowerCase())
      : Array.isArray(forwardedProto)
        ? forwardedProto.map((value) => value.trim().toLowerCase())
        : [];

  if (forwardedValues.includes("https")) {
    return true;
  }

  const protocol = (request as { protocol?: string }).protocol?.toLowerCase();

  if (protocol === "https") {
    return true;
  }

  for (const candidate of [config.redirectUri, config.frontendRedirectUri]) {
    if (!candidate) {
      continue;
    }

    try {
      if (new URL(candidate).protocol === "https:") {
        return true;
      }
    } catch {
      continue;
    }
  }

  return false;
}

function isPremiumRequiredMessage(message: string) {
  const normalized = message.trim().toLowerCase();
  return normalized.includes("premium") && normalized.includes("require");
}

function buildAuthorizeUrl(config: SpotifyConfig, state: string, codeVerifier: string) {
  const codeChallenge = createHash("sha256")
    .update(codeVerifier)
    .digest("base64url");
  const params = new URLSearchParams({
    client_id: config.clientId!,
    response_type: "code",
    redirect_uri: config.redirectUri!,
    state,
    code_challenge_method: "S256",
    code_challenge: codeChallenge,
    scope: config.scopes.join(" "),
  });

  return `${SPOTIFY_AUTHORIZE_URL}?${params.toString()}`;
}

function sanitizePageLimit(value: number | undefined, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(50, Math.floor(value)));
}

function sanitizePageOffset(value: number | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.floor(value));
}

function buildSpotifyPageUrl(
  path: string,
  query: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query)) {
    if (typeof value === "undefined") {
      continue;
    }

    params.set(key, String(value));
  }

  return `${SPOTIFY_API_BASE_URL}${path}?${params.toString()}`;
}

function getMockTrackPage(
  tracks: SpotifyCatalogTrackSummary[],
  limit: number,
  offset: number,
): SpotifyCatalogTrackPage {
  return {
    items: tracks.slice(offset, offset + limit),
    total: tracks.length,
    limit,
    offset,
  };
}

function getMockPlaylistPage(
  playlists: SpotifyCatalogPlaylistSummary[],
  limit: number,
  offset: number,
): SpotifyCatalogPlaylistPage {
  return {
    items: playlists.slice(offset, offset + limit),
    total: playlists.length,
    limit,
    offset,
  };
}

function normalizePlaybackRequest(
  payload: SpotifyStartPlaybackRequestBody,
): SpotifyStartPlaybackRequestBody {
  const deviceId = payload.deviceId?.trim();
  const contextUri = payload.contextUri?.trim();
  const uris =
    payload.uris
      ?.map((uri) => uri.trim())
      .filter((uri) => uri.length > 0) ?? [];
  const offsetPosition = payload.offset?.position;
  const offsetUri = payload.offset?.uri?.trim();

  if (!contextUri && uris.length === 0) {
    throw spotifyInvalidRequest(
      "Spotify playback requires a context URI or at least one track URI.",
    );
  }

  if (contextUri && uris.length > 0) {
    throw spotifyInvalidRequest(
      "Spotify playback accepts either contextUri or uris, not both at the same time.",
    );
  }

  if (
    typeof offsetPosition === "number" &&
    (!Number.isInteger(offsetPosition) || offsetPosition < 0)
  ) {
    throw spotifyInvalidRequest("Spotify playback offset.position must be a non-negative integer.");
  }

  if (
    typeof payload.positionMs === "number" &&
    (!Number.isFinite(payload.positionMs) || payload.positionMs < 0)
  ) {
    throw spotifyInvalidRequest("Spotify playback positionMs must be a non-negative number.");
  }

  return {
    deviceId: deviceId || undefined,
    contextUri: contextUri || undefined,
    uris: uris.length > 0 ? uris : undefined,
    offset:
      typeof offsetPosition === "number" || offsetUri
        ? {
            ...(typeof offsetPosition === "number" ? { position: offsetPosition } : {}),
            ...(offsetUri ? { uri: offsetUri } : {}),
          }
        : undefined,
    positionMs:
      typeof payload.positionMs === "number" ? Math.floor(payload.positionMs) : undefined,
  };
}

function createMockSessionSummary(
  healthConfigured: boolean,
  mockMode: SpotifyMockMode,
): SpotifySessionSummary {
  switch (mockMode) {
    case "signed_out":
      return {
        configured: healthConfigured,
        authenticated: false,
        authStatus: "disconnected",
        accountTier: "unknown",
        expiresAt: null,
        scopes: [],
        lastError: null,
        mockMode,
      };
    case "error":
      return {
        configured: healthConfigured,
        authenticated: false,
        authStatus: "error",
        accountTier: "premium",
        expiresAt: null,
        scopes: [
          "streaming",
          "user-read-playback-state",
          "user-modify-playback-state",
          "playlist-read-private",
        ],
        lastError: "Synthetic Spotify mock error.",
        mockMode,
      };
    default:
      return {
        configured: healthConfigured,
        authenticated: true,
        authStatus: "connected",
        accountTier: "premium",
        expiresAt: null,
        scopes: [
          "streaming",
          "user-read-playback-state",
          "user-modify-playback-state",
          "playlist-read-private",
        ],
        lastError: null,
        mockMode,
      };
  }
}

function createMockPlaybackState(mockMode: SpotifyMockMode): SpotifyPlaybackStateSummary {
  switch (mockMode) {
    case "signed_out":
      return {
        authenticated: false,
        sdkStatus: "idle",
        transferStatus: "idle",
        deviceId: null,
        deviceName: null,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        currentTrack: null,
        lastError: null,
        mockMode,
      };
    case "connected":
      return {
        authenticated: true,
        sdkStatus: "idle",
        transferStatus: "idle",
        deviceId: null,
        deviceName: MOCK_BROWSER_DEVICE_NAME,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        currentTrack: null,
        lastError: null,
        mockMode,
      };
    case "ready":
      return {
        authenticated: true,
        sdkStatus: "ready",
        transferStatus: "idle",
        deviceId: MOCK_BROWSER_DEVICE_ID,
        deviceName: MOCK_BROWSER_DEVICE_NAME,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: MOCK_TRACK.durationMs,
        currentTrack: MOCK_TRACK,
        lastError: null,
        mockMode,
      };
    case "error":
      return {
        authenticated: false,
        sdkStatus: "error",
        transferStatus: "error",
        deviceId: null,
        deviceName: MOCK_BROWSER_DEVICE_NAME,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        currentTrack: null,
        lastError: "Synthetic Spotify mock error.",
        mockMode,
      };
    case "active":
    default:
      return {
        authenticated: true,
        sdkStatus: "ready",
        transferStatus: "active",
        deviceId: MOCK_BROWSER_DEVICE_ID,
        deviceName: MOCK_BROWSER_DEVICE_NAME,
        isActiveDevice: true,
        isPlaying: true,
        positionMs: 64_200,
        durationMs: MOCK_TRACK.durationMs,
        currentTrack: MOCK_TRACK,
        lastError: null,
        mockMode,
      };
  }
}

class InMemorySpotifyService implements SpotifyService {
  private readonly sessions = new Map<string, SpotifySessionRecord>();
  private readonly healthSnapshot: ReturnType<typeof createSpotifyHealthSnapshot>;
  private readonly mockMode: SpotifyMockMode | null;

  constructor(private readonly config: SpotifyConfig = DEFAULT_SPOTIFY_CONFIG) {
    this.healthSnapshot = createSpotifyHealthSnapshot(config);
    this.mockMode = normalizeMockMode(config.mockMode);
  }

  getHealthSnapshot() {
    return structuredClone(this.healthSnapshot);
  }

  async startLogin(request: FastifyRequest, reply: FastifyReply) {
    if (this.mockMode) {
      reply.redirect(this.config.frontendRedirectUri ?? "/");
      return;
    }

    this.assertConfigured();

    const session = this.getOrCreateSession(request, reply);
    const oauthState = randomBytes(18).toString("base64url");
    const codeVerifier = randomBytes(48).toString("base64url");

    session.oauthState = oauthState;
    session.codeVerifier = codeVerifier;
    session.lastError = null;

    reply.redirect(buildAuthorizeUrl(this.config, oauthState, codeVerifier));
  }

  async handleCallback(request: FastifyRequest, reply: FastifyReply) {
    if (this.mockMode) {
      reply.redirect(this.config.frontendRedirectUri ?? "/");
      return;
    }

    this.assertConfigured();

    const query = (request.query ?? {}) as {
      code?: string;
      state?: string;
      error?: string;
    };
    const session = this.getSession(request);

    if (!session || !session.oauthState || !session.codeVerifier) {
      throw spotifyInvalidState("Spotify callback arrived without an active PKCE session.");
    }

    if (query.error) {
      session.oauthState = null;
      session.codeVerifier = null;
      session.lastError = query.error;
      reply.redirect(this.config.frontendRedirectUri!);
      return;
    }

    if (!query.code) {
      throw spotifyMissingCode();
    }

    if (!query.state || query.state !== session.oauthState) {
      throw spotifyInvalidState();
    }

    const token = await this.exchangeAuthorizationCode(query.code, session.codeVerifier);
    session.oauthState = null;
    session.codeVerifier = null;
    this.applyTokenResponse(session, token);
    await this.refreshProfile(session);
    session.lastError = null;

    reply.redirect(this.config.frontendRedirectUri!);
  }

  async getSessionSummary(request: FastifyRequest): Promise<SpotifySessionSummary> {
    if (this.mockMode) {
      return createMockSessionSummary(this.healthSnapshot.configured, this.mockMode);
    }

    if (!this.healthSnapshot.configured) {
      return {
        configured: false,
        authenticated: false,
        authStatus: "disconnected" as const,
        accountTier: "unknown" as const,
        expiresAt: null,
        scopes: [...this.config.scopes],
        lastError: this.healthSnapshot.reason,
        mockMode: null,
      };
    }

    const session = this.getSession(request);

    if (!session?.accessToken) {
      return {
        configured: true,
        authenticated: false,
        authStatus: "disconnected" as const,
        accountTier: "unknown" as const,
        expiresAt: null,
        scopes: [...this.config.scopes],
        lastError: session?.lastError ?? null,
        mockMode: null,
      };
    }

    return {
      configured: true,
      authenticated: true,
      authStatus: "connected",
      accountTier: session.accountTier,
      expiresAt: toIsoOrNull(session.expiresAt),
      scopes: [...session.scopes],
      lastError: session.lastError,
      mockMode: null,
    };
  }

  async getAccessTokenPayload(request: FastifyRequest): Promise<SpotifyTokenPayload> {
    if (this.mockMode) {
      return {
        accessToken: "mock-spotify-access-token",
        expiresAt: null,
        tokenType: "Bearer",
      } satisfies SpotifyTokenPayload;
    }

    const session = this.getAuthenticatedSession(request);
    this.ensurePremiumAccount(session);
    const accessToken = await this.ensureAccessToken(session);

    return {
      accessToken,
      expiresAt: toIsoOrNull(session.expiresAt),
      tokenType: "Bearer" as const,
    };
  }

  async getPlaybackState(request: FastifyRequest): Promise<SpotifyPlaybackStateSummary> {
    if (this.mockMode) {
      return createMockPlaybackState(this.mockMode);
    }

    if (!this.healthSnapshot.configured) {
      return {
        authenticated: false,
        sdkStatus: null,
        transferStatus: "idle" as const,
        deviceId: null,
        deviceName: null,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        currentTrack: null,
        lastError: this.healthSnapshot.reason,
        mockMode: null,
      };
    }

    const session = this.getSession(request);

    if (!session?.accessToken) {
      return {
        authenticated: false,
        sdkStatus: null,
        transferStatus: "idle" as const,
        deviceId: null,
        deviceName: session?.browserDeviceName ?? null,
        isActiveDevice: false,
        isPlaying: false,
        positionMs: 0,
        durationMs: 0,
        currentTrack: null,
        lastError: session?.lastError ?? null,
        mockMode: null,
      };
    }

    let playback: SpotifyPlaybackResponse;
    let devices: SpotifyDevicesResponse;

    try {
      playback = await this.fetchPlaybackResponse(session);
      devices = await this.fetchDevicesResponse(session);
    } catch (error) {
      if (isSpotifyApiError(error) && error.code === "spotify_premium_required") {
        session.lastError = error.message;

        return {
          authenticated: true,
          sdkStatus: null,
          transferStatus: "idle" as const,
          deviceId: session.browserDeviceId,
          deviceName: session.browserDeviceName,
          isActiveDevice: false,
          isPlaying: false,
          positionMs: 0,
          durationMs: 0,
          currentTrack: null,
          lastError: error.message,
          mockMode: null,
        };
      }

      throw error;
    }

    const browserDevice =
      session.browserDeviceId
        ? devices.devices?.find((device) => device.id === session.browserDeviceId) ?? null
        : null;
    const isActiveDevice = Boolean(
      session.browserDeviceId &&
        (browserDevice?.is_active || playback.device?.id === session.browserDeviceId),
    );
    const knownBrowserDeviceId =
      browserDevice?.id ??
      (isActiveDevice ? playback.device?.id ?? null : null);
    const currentTrack = this.normalizeTrack(playback.item);
    const transferStatus: SpotifyPlaybackStateSummary["transferStatus"] =
      isActiveDevice
        ? "active"
        : knownBrowserDeviceId
          ? "pending"
          : "idle";
    const deviceName =
      browserDevice?.name ||
      (isActiveDevice ? playback.device?.name : undefined) ||
      session.browserDeviceName ||
      null;

    return {
      authenticated: true,
      sdkStatus: null,
      transferStatus,
      deviceId: knownBrowserDeviceId,
      deviceName,
      isActiveDevice,
      isPlaying: Boolean(playback.is_playing),
      positionMs:
        typeof playback.progress_ms === "number" ? playback.progress_ms : 0,
      durationMs: currentTrack?.durationMs ?? 0,
      currentTrack,
      lastError: session.lastError,
      mockMode: null,
    };
  }

  async searchTracks(
    request: FastifyRequest,
    query: {
      query: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<SpotifyCatalogTrackPage> {
    const limit = sanitizePageLimit(query.limit, 8);
    const offset = sanitizePageOffset(query.offset);
    const searchQuery = query.query.trim();

    if (!searchQuery) {
      throw spotifyInvalidRequest("Spotify search query is required.");
    }

    if (this.mockMode) {
      const matches = MOCK_SPOTIFY_TRACKS.filter((track) => {
        const haystack = `${track.title} ${track.artist} ${track.album}`.toLowerCase();
        return haystack.includes(searchQuery.toLowerCase());
      });

      return getMockTrackPage(matches, limit, offset);
    }

    const session = this.getAuthenticatedSession(request);
    const payload = await this.authorizedFetch(
      buildSpotifyPageUrl("/search", {
        q: searchQuery,
        type: "track",
        limit,
        offset,
      }),
      session,
      undefined,
      true,
    );

    return normalizeSpotifySearchTracks(payload ?? {});
  }

  async getCurrentUserPlaylists(
    request: FastifyRequest,
    query: {
      limit?: number;
      offset?: number;
    },
  ): Promise<SpotifyCatalogPlaylistPage> {
    const limit = sanitizePageLimit(query.limit, 8);
    const offset = sanitizePageOffset(query.offset);

    if (this.mockMode) {
      return getMockPlaylistPage(MOCK_SPOTIFY_PLAYLISTS, limit, offset);
    }

    const session = this.getAuthenticatedSession(request);
    const payload = await this.authorizedFetch(
      buildSpotifyPageUrl("/me/playlists", {
        limit,
        offset,
      }),
      session,
      undefined,
      true,
    );

    return normalizeSpotifyPlaylists(payload ?? {});
  }

  async getPlaylistItems(
    request: FastifyRequest,
    playlistId: string,
    query: {
      limit?: number;
      offset?: number;
    },
  ): Promise<SpotifyCatalogTrackPage> {
    const normalizedPlaylistId = playlistId.trim();
    const limit = sanitizePageLimit(query.limit, 20);
    const offset = sanitizePageOffset(query.offset);

    if (!normalizedPlaylistId) {
      throw spotifyInvalidRequest("Spotify playlist id is required.");
    }

    if (this.mockMode) {
      return getMockTrackPage(MOCK_SPOTIFY_TRACKS, limit, offset);
    }

    const session = this.getAuthenticatedSession(request);
    const payload = await this.authorizedFetch(
      buildSpotifyPageUrl(
        `/playlists/${encodeURIComponent(normalizedPlaylistId)}/items`,
        {
          limit,
          offset,
        },
      ),
      session,
      undefined,
      true,
    );

    return normalizeSpotifyPlaylistItems(payload ?? {});
  }

  async startPlayback(
    request: FastifyRequest,
    payload: SpotifyStartPlaybackRequestBody,
  ): Promise<SpotifyPlaybackStateSummary> {
    const normalizedPayload = normalizePlaybackRequest(payload);

    if (this.mockMode) {
      return {
        ...createMockPlaybackState("active"),
        deviceId: normalizedPayload.deviceId ?? MOCK_BROWSER_DEVICE_ID,
        currentTrack: {
          ...MOCK_TRACK,
          id: MOCK_SPOTIFY_TRACKS[0].id,
          title: MOCK_SPOTIFY_TRACKS[0].title,
          artist: MOCK_SPOTIFY_TRACKS[0].artist,
          album: MOCK_SPOTIFY_TRACKS[0].album,
          durationMs: MOCK_SPOTIFY_TRACKS[0].durationMs,
          coverUrl: MOCK_SPOTIFY_TRACKS[0].coverUrl,
        },
      };
    }

    const session = this.getAuthenticatedSession(request);
    this.ensurePremiumAccount(session);

    if (normalizedPayload.deviceId) {
      session.browserDeviceId = normalizedPayload.deviceId;
      await this.authorizedFetch(`${SPOTIFY_API_BASE_URL}/me/player`, session, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          device_ids: [normalizedPayload.deviceId],
          play: true,
        }),
      });
    }

    const query = new URLSearchParams();

    if (normalizedPayload.deviceId) {
      query.set("device_id", normalizedPayload.deviceId);
    }

    const endpoint = query.size > 0
      ? `${SPOTIFY_API_BASE_URL}/me/player/play?${query.toString()}`
      : `${SPOTIFY_API_BASE_URL}/me/player/play`;

    await this.authorizedFetch(
      endpoint,
      session,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...(normalizedPayload.contextUri
            ? { context_uri: normalizedPayload.contextUri }
            : {}),
          ...(normalizedPayload.uris ? { uris: normalizedPayload.uris } : {}),
          ...(normalizedPayload.offset ? { offset: normalizedPayload.offset } : {}),
          ...(typeof normalizedPayload.positionMs === "number"
            ? { position_ms: normalizedPayload.positionMs }
            : {}),
        }),
      },
      true,
    );

    session.lastError = null;
    return this.getPlaybackState(request);
  }

  async transferPlayback(
    request: FastifyRequest,
    payload: SpotifyTransferRequestBody,
  ): Promise<SpotifyPlaybackStateSummary> {
    const deviceId = payload.deviceId?.trim();

    if (!deviceId) {
      throw spotifyDeviceMissing();
    }

    if (this.mockMode) {
      return {
        ...createMockPlaybackState("active"),
        deviceId,
        deviceName: payload.deviceName?.trim() || MOCK_BROWSER_DEVICE_NAME,
      };
    }

    const session = this.getAuthenticatedSession(request);
    this.ensurePremiumAccount(session);
    session.browserDeviceId = deviceId;
    session.browserDeviceName = payload.deviceName?.trim() || session.browserDeviceName;

    await this.authorizedFetch(`${SPOTIFY_API_BASE_URL}/me/player`, session, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        device_ids: [deviceId],
        play: payload.play ?? true,
      }),
    });

    session.lastError = null;
    return this.getPlaybackState(request);
  }

  async disconnect(_request: FastifyRequest, reply: FastifyReply) {
    const sessionId = this.getSessionId(_request);

    if (sessionId) {
      this.sessions.delete(sessionId);
    }

    appendSetCookie(
      reply,
      serializeCookie(SESSION_COOKIE_NAME, "", {
        maxAge: 0,
        secure: shouldUseSecureCookie(_request, this.config),
      }),
    );

    return { ok: true } satisfies SpotifyDisconnectResponse;
  }

  private getSessionId(request: FastifyRequest) {
    return parseCookieHeader(request.headers.cookie).get(SESSION_COOKIE_NAME) ?? null;
  }

  private getSession(request: FastifyRequest) {
    const sessionId = this.getSessionId(request);
    return sessionId ? this.sessions.get(sessionId) ?? null : null;
  }

  private getOrCreateSession(request: FastifyRequest, reply: FastifyReply) {
    const existing = this.getSession(request);

    if (existing) {
      return existing;
    }

    const id = randomUUID();
    const session: SpotifySessionRecord = {
      id,
      oauthState: null,
      codeVerifier: null,
      accessToken: null,
      refreshToken: null,
      expiresAt: null,
      scopes: [...this.config.scopes],
      accountTier: "unknown",
      lastError: null,
      browserDeviceId: null,
      browserDeviceName: MOCK_BROWSER_DEVICE_NAME,
    };

    this.sessions.set(id, session);
    appendSetCookie(
      reply,
      serializeCookie(SESSION_COOKIE_NAME, id, {
        secure: shouldUseSecureCookie(request, this.config),
      }),
    );
    return session;
  }

  private getAuthenticatedSession(request: FastifyRequest) {
    this.assertConfigured();
    const session = this.getSession(request);

    if (!session?.accessToken) {
      throw spotifyNotAuthenticated();
    }

    return session;
  }

  private assertConfigured() {
    if (!this.healthSnapshot.configured) {
      throw spotifyNotConfigured(this.healthSnapshot.reason ?? undefined);
    }
  }

  private ensurePremiumAccount(session: SpotifySessionRecord) {
    if (session.accountTier === "free") {
      throw spotifyPremiumRequired();
    }
  }

  private async exchangeAuthorizationCode(
    code: string,
    codeVerifier: string,
  ): Promise<SpotifyTokenResponse> {
    const body = new URLSearchParams({
      client_id: this.config.clientId!,
      grant_type: "authorization_code",
      code,
      redirect_uri: this.config.redirectUri!,
      code_verifier: codeVerifier,
    });
    const response = await fetchSpotifyWithBackoff(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = await readResponseBody(response);

    if (!response.ok) {
      throw spotifyUpstreamError(
        getSpotifyUpstreamMessage(payload, "Spotify authorization code exchange failed."),
      );
    }

    return payload as unknown as SpotifyTokenResponse;
  }

  private applyTokenResponse(session: SpotifySessionRecord, token: SpotifyTokenResponse) {
    session.accessToken = token.access_token;
    session.refreshToken = token.refresh_token ?? session.refreshToken;
    session.expiresAt = Date.now() + token.expires_in * 1000;
    session.scopes =
      token.scope
        ?.split(/\s+/u)
        .map((scope) => scope.trim())
        .filter((scope) => scope.length > 0) ?? session.scopes;
  }

  private async refreshAccessToken(session: SpotifySessionRecord): Promise<void> {
    if (!session.refreshToken) {
      throw spotifyNotAuthenticated("Spotify refresh token is missing.");
    }

    const body = new URLSearchParams({
      client_id: this.config.clientId!,
      grant_type: "refresh_token",
      refresh_token: session.refreshToken,
    });
    const response = await fetchSpotifyWithBackoff(SPOTIFY_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body,
    });
    const payload = await readResponseBody(response);

    if (!response.ok) {
      throw spotifyUpstreamError(
        getSpotifyUpstreamMessage(payload, "Spotify token refresh failed."),
      );
    }

    this.applyTokenResponse(session, payload as unknown as SpotifyTokenResponse);
  }

  private async ensureAccessToken(session: SpotifySessionRecord): Promise<string> {
    if (!session.accessToken || !session.expiresAt) {
      throw spotifyNotAuthenticated();
    }

    if (Date.now() + TOKEN_REFRESH_SKEW_MS >= session.expiresAt) {
      await this.refreshAccessToken(session);
    }

    return session.accessToken!;
  }

  private async refreshProfile(session: SpotifySessionRecord): Promise<void> {
    try {
      const profile = await this.authorizedFetch(
        `${SPOTIFY_API_BASE_URL}/me`,
        session,
      );
      session.accountTier = normalizeAccountTier(
        (profile as SpotifyProfileResponse).product,
      );
    } catch (error) {
      session.lastError = getErrorMessage(error);
    }
  }

  private async fetchPlaybackResponse(
    session: SpotifySessionRecord,
  ): Promise<SpotifyPlaybackResponse> {
    const payload = await this.authorizedFetch(
      `${SPOTIFY_API_BASE_URL}/me/player`,
      session,
      undefined,
      true,
    );

    return (payload ?? {}) as SpotifyPlaybackResponse;
  }

  private async fetchDevicesResponse(
    session: SpotifySessionRecord,
  ): Promise<SpotifyDevicesResponse> {
    const payload = await this.authorizedFetch(
      `${SPOTIFY_API_BASE_URL}/me/player/devices`,
      session,
      undefined,
      true,
    );

    return (payload ?? {}) as SpotifyDevicesResponse;
  }

  private normalizeTrack(
    item: SpotifyPlaybackResponse["item"],
  ): SpotifyPlaybackTrackPayload | null {
    if (!item || item.type !== "track" || !item.id || !item.name) {
      return null;
    }

    return {
      id: item.id,
      title: item.name,
      artist:
        item.artists
          ?.map((artist) => artist.name?.trim())
          .filter((value): value is string => Boolean(value))?.join(", ") || "Spotify",
      album: item.album?.name?.trim() || "Spotify",
      durationMs:
        typeof item.duration_ms === "number" ? item.duration_ms : 0,
      coverUrl: item.album?.images?.[0]?.url ?? null,
    } satisfies SpotifyPlaybackTrackPayload;
  }

  private async authorizedFetch(
    input: string,
    session: SpotifySessionRecord,
    init: RequestInit = {},
    allowEmpty = false,
    attempt = 0,
  ): Promise<Record<string, unknown> | string | null> {
    try {
      const accessToken = await this.ensureAccessToken(session);
      const response = await fetchSpotifyWithBackoff(input, {
        ...init,
        headers: {
          ...(init.headers ?? {}),
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (allowEmpty && response.status === 204) {
        return null;
      }

      if (response.status === 401 && attempt === 0 && session.refreshToken) {
        await this.refreshAccessToken(session);
        return this.authorizedFetch(input, session, init, allowEmpty, attempt + 1);
      }

      const payload = await readResponseBody(response);

      if (!response.ok) {
        const message = getSpotifyUpstreamMessage(payload, "Spotify Web API request failed.");

        if (response.status === 403 && isPremiumRequiredMessage(message)) {
          throw spotifyPremiumRequired(message);
        }

        throw spotifyUpstreamError(
          message,
        );
      }

      session.lastError = null;
      return payload;
    } catch (error) {
      session.lastError = getErrorMessage(error);

      if (isSpotifyApiError(error)) {
        throw error;
      }

      throw spotifyUpstreamError(session.lastError);
    }
  }
}

export function createSpotifyService(
  config: SpotifyConfig = DEFAULT_SPOTIFY_CONFIG,
): SpotifyService {
  return new InMemorySpotifyService(config);
}
