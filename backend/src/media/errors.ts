import type { MediaErrorCode, MediaErrorResponse } from "./types.js";

export class MediaApiError extends Error {
  readonly code: MediaErrorCode;
  readonly statusCode: number;

  constructor(statusCode: number, code: MediaErrorCode, message: string) {
    super(message);
    this.name = "MediaApiError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export function isMediaApiError(value: unknown): value is MediaApiError {
  return value instanceof MediaApiError;
}

export function createMediaErrorResponse(
  code: MediaErrorCode,
  message: string,
): MediaErrorResponse {
  return {
    error: {
      code,
      message,
    },
  };
}

export function invalidCommand(message = "Invalid media command payload.") {
  return new MediaApiError(400, "invalid_command", message);
}

export function invalidTrackId(message = "Invalid track id.") {
  return new MediaApiError(400, "invalid_track_id", message);
}

export function mediaLibraryPathMissing(
  message = "MEDIA_LIBRARY_PATH is not configured.",
) {
  return new MediaApiError(400, "media_library_path_missing", message);
}

export function trackNotFound(trackId: number) {
  return new MediaApiError(404, "track_not_found", `Track not found: ${trackId}`);
}

export function trackStreamUnavailable(trackId: number) {
  return new MediaApiError(
    404,
    "track_stream_unavailable",
    `Track file is not available for track ${trackId}.`,
  );
}

export function commandConflict(message: string) {
  return new MediaApiError(409, "command_conflict", message);
}

export function dependencyUnavailable(message: string) {
  return new MediaApiError(503, "dependency_unavailable", message);
}

export function internalError(message = "Internal backend media error.") {
  return new MediaApiError(500, "internal_error", message);
}
