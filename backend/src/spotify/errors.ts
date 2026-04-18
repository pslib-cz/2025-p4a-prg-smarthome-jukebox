export type SpotifyErrorCode =
  | "spotify_not_configured"
  | "spotify_not_authenticated"
  | "spotify_premium_required"
  | "spotify_invalid_state"
  | "spotify_missing_code"
  | "spotify_invalid_request"
  | "spotify_device_missing"
  | "spotify_upstream_error"
  | "spotify_internal_error";

export interface SpotifyErrorResponse {
  error: {
    code: SpotifyErrorCode;
    message: string;
  };
}

export class SpotifyApiError extends Error {
  readonly code: SpotifyErrorCode;
  readonly statusCode: number;

  constructor(statusCode: number, code: SpotifyErrorCode, message: string) {
    super(message);
    this.name = "SpotifyApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isSpotifyApiError(value: unknown): value is SpotifyApiError {
  return value instanceof SpotifyApiError;
}

export function createSpotifyErrorResponse(
  code: SpotifyErrorCode,
  message: string,
): SpotifyErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}

export function spotifyNotConfigured(
  message = "Spotify web playback is not configured.",
) {
  return new SpotifyApiError(503, "spotify_not_configured", message);
}

export function spotifyNotAuthenticated(
  message = "Spotify session is not authenticated.",
) {
  return new SpotifyApiError(401, "spotify_not_authenticated", message);
}

export function spotifyPremiumRequired(
  message = "Spotify Premium is required for browser playback and playback transfer.",
) {
  return new SpotifyApiError(403, "spotify_premium_required", message);
}

export function spotifyInvalidState(
  message = "Spotify OAuth state validation failed.",
) {
  return new SpotifyApiError(400, "spotify_invalid_state", message);
}

export function spotifyMissingCode(
  message = "Spotify callback is missing the authorization code.",
) {
  return new SpotifyApiError(400, "spotify_missing_code", message);
}

export function spotifyInvalidRequest(
  message = "Spotify request payload is invalid.",
) {
  return new SpotifyApiError(400, "spotify_invalid_request", message);
}

export function spotifyDeviceMissing(
  message = "Spotify browser device id is required.",
) {
  return new SpotifyApiError(400, "spotify_device_missing", message);
}

export function spotifyUpstreamError(message: string) {
  return new SpotifyApiError(502, "spotify_upstream_error", message);
}

export function spotifyInternalError(
  message = "Spotify integration failed.",
) {
  return new SpotifyApiError(500, "spotify_internal_error", message);
}
