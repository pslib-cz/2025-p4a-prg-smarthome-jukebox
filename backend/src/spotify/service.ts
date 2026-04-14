import { createHash, randomBytes, randomUUID } from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import type { SpotifyConfig } from "../config/env.js";
import { createSpotifyHealthSnapshot } from "./config.js";
import {
  isSpotifyApiError,
  spotifyDeviceMissing,
  spotifyInvalidState,
  spotifyMissingCode,
  spotifyNotAuthenticated,
  spotifyNotConfigured,
  spotifyPremiumRequired,
  spotifyUpstreamError,
} from "./errors.js";
import type {
  SpotifyAccountTier,
  SpotifyDisconnectResponse,
  SpotifyMockMode,
  SpotifyPlaybackStateSummary,
  SpotifyPlaybackTrackPayload,
  SpotifySdkStatus,
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
        scopes: ["streaming", "user-read-playback-state", "user-modify-playback-state"],
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
        scopes: ["streaming", "user-read-playback-state", "user-modify-playback-state"],
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
      authStatus: session.lastError ? "error" : "connected",
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
    const currentTrack = this.normalizeTrack(playback.item);
    const transferStatus: SpotifyPlaybackStateSummary["transferStatus"] =
      isActiveDevice
        ? "active"
        : session.browserDeviceId
          ? "pending"
          : "idle";

    return {
      authenticated: true,
      sdkStatus: null,
      transferStatus,
      deviceId: session.browserDeviceId ?? playback.device?.id ?? null,
      deviceName:
        session.browserDeviceName ??
        browserDevice?.name ??
        playback.device?.name ??
        null,
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
    const response = await fetch(SPOTIFY_TOKEN_URL, {
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
    const response = await fetch(SPOTIFY_TOKEN_URL, {
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
      const response = await fetch(input, {
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
