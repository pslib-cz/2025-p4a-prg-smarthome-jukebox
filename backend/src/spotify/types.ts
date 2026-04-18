import type { FastifyReply, FastifyRequest } from "fastify";
import type { BackendSpotifyHealthSnapshot } from "../runtime/types.js";
import type {
  SpotifyCatalogPlaylistPage,
  SpotifyCatalogTrackPage,
} from "./catalog.js";

export type {
  SpotifyCatalogPlaylistPage,
  SpotifyCatalogPlaylistSummary,
  SpotifyCatalogTrackPage,
  SpotifyCatalogTrackSummary,
} from "./catalog.js";

export type SpotifyAuthStatus =
  | "disconnected"
  | "authorizing"
  | "connected"
  | "error";

export type SpotifySdkStatus =
  | "idle"
  | "loading"
  | "ready"
  | "not_ready"
  | "error";

export type SpotifyTransferStatus = "idle" | "pending" | "active" | "error";
export type SpotifyAccountTier = "unknown" | "free" | "premium";
export type SpotifyMockMode =
  | "signed_out"
  | "connected"
  | "ready"
  | "active"
  | "error";

export interface SpotifySessionSummary {
  configured: boolean;
  authenticated: boolean;
  authStatus: SpotifyAuthStatus;
  accountTier: SpotifyAccountTier;
  expiresAt: string | null;
  scopes: string[];
  lastError: string | null;
  mockMode: SpotifyMockMode | null;
}

export interface SpotifyPlaybackTrackPayload {
  id: string;
  title: string;
  artist: string;
  album: string;
  durationMs: number;
  coverUrl: string | null;
}

export interface SpotifyPlaybackStateSummary {
  authenticated: boolean;
  sdkStatus: SpotifySdkStatus | null;
  transferStatus: SpotifyTransferStatus;
  deviceId: string | null;
  deviceName: string | null;
  isActiveDevice: boolean;
  isPlaying: boolean;
  positionMs: number;
  durationMs: number;
  currentTrack: SpotifyPlaybackTrackPayload | null;
  lastError: string | null;
  mockMode: SpotifyMockMode | null;
}

export interface SpotifyTokenPayload {
  accessToken: string;
  expiresAt: string | null;
  tokenType: "Bearer";
}

export interface SpotifyTransferRequestBody {
  deviceId?: string;
  deviceName?: string;
  play?: boolean;
}

export interface SpotifyPlaybackOffset {
  position?: number;
  uri?: string;
}

export interface SpotifyStartPlaybackRequestBody {
  deviceId?: string;
  contextUri?: string;
  uris?: string[];
  offset?: SpotifyPlaybackOffset;
  positionMs?: number;
}

export interface SpotifyDisconnectResponse {
  ok: true;
}

export interface SpotifyService {
  getHealthSnapshot(): BackendSpotifyHealthSnapshot;
  startLogin(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  handleCallback(request: FastifyRequest, reply: FastifyReply): Promise<void>;
  getSessionSummary(request: FastifyRequest): Promise<SpotifySessionSummary>;
  getAccessTokenPayload(request: FastifyRequest): Promise<SpotifyTokenPayload>;
  getPlaybackState(request: FastifyRequest): Promise<SpotifyPlaybackStateSummary>;
  searchTracks(
    request: FastifyRequest,
    query: {
      query: string;
      limit?: number;
      offset?: number;
    },
  ): Promise<SpotifyCatalogTrackPage>;
  getCurrentUserPlaylists(
    request: FastifyRequest,
    query: {
      limit?: number;
      offset?: number;
    },
  ): Promise<SpotifyCatalogPlaylistPage>;
  getPlaylistItems(
    request: FastifyRequest,
    playlistId: string,
    query: {
      limit?: number;
      offset?: number;
    },
  ): Promise<SpotifyCatalogTrackPage>;
  startPlayback(
    request: FastifyRequest,
    payload: SpotifyStartPlaybackRequestBody,
  ): Promise<SpotifyPlaybackStateSummary>;
  transferPlayback(
    request: FastifyRequest,
    payload: SpotifyTransferRequestBody,
  ): Promise<SpotifyPlaybackStateSummary>;
  disconnect(
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<SpotifyDisconnectResponse>;
}

export function isSpotifyService(value: unknown): value is SpotifyService {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as SpotifyService;
  return (
    typeof candidate.getHealthSnapshot === "function" &&
    typeof candidate.startLogin === "function" &&
    typeof candidate.handleCallback === "function" &&
    typeof candidate.getSessionSummary === "function" &&
    typeof candidate.getAccessTokenPayload === "function" &&
    typeof candidate.getPlaybackState === "function" &&
    typeof candidate.searchTracks === "function" &&
    typeof candidate.getCurrentUserPlaylists === "function" &&
    typeof candidate.getPlaylistItems === "function" &&
    typeof candidate.startPlayback === "function" &&
    typeof candidate.transferPlayback === "function" &&
    typeof candidate.disconnect === "function"
  );
}
