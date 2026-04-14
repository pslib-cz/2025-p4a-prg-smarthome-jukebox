import type { SpotifyConfig } from "../config/env.js";
import type { BackendSpotifyHealthSnapshot } from "../runtime/types.js";

function isLoopbackIpLiteral(hostname: string) {
  return (
    hostname === "127.0.0.1" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function validateAbsoluteBrowserUrl(
  value: string,
  fieldName: string,
) {
  let parsed: URL;

  try {
    parsed = new URL(value);
  } catch {
    return `${fieldName} must be an absolute URL.`;
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `${fieldName} must use http or https.`;
  }

  return null;
}

function validateSpotifyRedirectUri(redirectUri: string) {
  const urlError = validateAbsoluteBrowserUrl(
    redirectUri,
    "HAJUKEBOX_SPOTIFY_REDIRECT_URI",
  );

  if (urlError) {
    return urlError;
  }

  const parsed = new URL(redirectUri);

  if (parsed.protocol === "http:") {
    if (parsed.hostname === "localhost") {
      return "HAJUKEBOX_SPOTIFY_REDIRECT_URI must use 127.0.0.1 instead of localhost for local HTTP redirects.";
    }

    if (!isLoopbackIpLiteral(parsed.hostname)) {
      return "HAJUKEBOX_SPOTIFY_REDIRECT_URI may use http only for an explicit loopback IP such as 127.0.0.1.";
    }
  }

  return null;
}

export function createSpotifyHealthSnapshot(
  config: SpotifyConfig,
  timestamp = new Date().toISOString(),
): BackendSpotifyHealthSnapshot {
  const providedFields = [
    config.clientId,
    config.redirectUri,
    config.frontendRedirectUri,
  ].filter((value) => value !== null);
  const hasAnyConfiguredField = providedFields.length > 0;
  const problems: string[] = [];

  if (hasAnyConfiguredField && !config.clientId) {
    problems.push("missing HAJUKEBOX_SPOTIFY_CLIENT_ID");
  }

  if (hasAnyConfiguredField && !config.redirectUri) {
    problems.push("missing HAJUKEBOX_SPOTIFY_REDIRECT_URI");
  }

  if (hasAnyConfiguredField && !config.frontendRedirectUri) {
    problems.push("missing HAJUKEBOX_SPOTIFY_FRONTEND_REDIRECT_URI");
  }

  if (config.redirectUri) {
    const redirectError = validateSpotifyRedirectUri(config.redirectUri);

    if (redirectError) {
      problems.push(redirectError);
    }
  }

  if (config.frontendRedirectUri) {
    const frontendRedirectError = validateAbsoluteBrowserUrl(
      config.frontendRedirectUri,
      "HAJUKEBOX_SPOTIFY_FRONTEND_REDIRECT_URI",
    );

    if (frontendRedirectError) {
      problems.push(frontendRedirectError);
    }
  }

  if (!hasAnyConfiguredField) {
    return {
      status: "disabled",
      reason: "Spotify web playback is not configured.",
      lastChangedAt: timestamp,
      configured: false,
      clientIdConfigured: false,
      redirectUri: null,
      frontendRedirectUri: null,
      scopes: [...config.scopes],
    };
  }

  if (problems.length > 0) {
    return {
      status: "degraded",
      reason: `Spotify config is incomplete or invalid: ${problems.join(" ")}`,
      lastChangedAt: timestamp,
      configured: false,
      clientIdConfigured: config.clientId !== null,
      redirectUri: config.redirectUri,
      frontendRedirectUri: config.frontendRedirectUri,
      scopes: [...config.scopes],
    };
  }

  return {
    status: "ready",
    reason: null,
    lastChangedAt: timestamp,
    configured: true,
    clientIdConfigured: true,
    redirectUri: config.redirectUri,
    frontendRedirectUri: config.frontendRedirectUri,
    scopes: [...config.scopes],
  };
}
