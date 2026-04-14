import type { SpotifyState } from "../state/jukeboxTypes";

export interface SpotifyPanelViewModel {
  statusLabel: string;
  statusCopy: string;
  primaryActionLabel: string;
  primaryActionKind:
    | "authorize"
    | "initialize"
    | "transfer"
    | "active"
    | "disabled";
  secondaryActionLabel: string | null;
  timeline: Array<{
    label: string;
    value: string;
    complete: boolean;
  }>;
}

function formatMs(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function getSpotifyTrackProgress(spotify: SpotifyState) {
  return `${formatMs(spotify.positionMs)} / ${formatMs(spotify.durationMs)}`;
}

export function buildSpotifyPanelViewModel(
  spotify: SpotifyState,
): SpotifyPanelViewModel {
  const isAuthorized = spotify.authStatus === "connected";
  const isSdkReady = spotify.sdkStatus === "ready";
  const isTransferred =
    spotify.transferStatus === "active" && spotify.isActiveDevice;

  if (!spotify.configured) {
    return {
      statusLabel: "Not Configured",
      statusCopy: "Backend Spotify credentials or redirect URIs are still missing.",
      primaryActionLabel: "Spotify Unavailable",
      primaryActionKind: "disabled",
      secondaryActionLabel: null,
      timeline: [
        { label: "Auth", value: "Config required", complete: false },
        { label: "SDK", value: "Browser player idle", complete: false },
        { label: "Transfer", value: "Local playback stays active", complete: false },
      ],
    };
  }

  if (spotify.authStatus === "authorizing") {
    return {
      statusLabel: "Authorizing",
      statusCopy: "Finish the Spotify PKCE login flow in the browser redirect.",
      primaryActionLabel: "Waiting for Spotify",
      primaryActionKind: "disabled",
      secondaryActionLabel: null,
      timeline: [
        { label: "Auth", value: "Redirect in progress", complete: false },
        { label: "SDK", value: "Waiting for callback", complete: false },
        { label: "Transfer", value: "No active device", complete: false },
      ],
    };
  }

  if (spotify.authStatus === "error") {
    return {
      statusLabel: "Authorization Error",
      statusCopy: spotify.lastError ?? "Spotify login failed before the session could be established.",
      primaryActionLabel: "Retry Spotify Login",
      primaryActionKind: "authorize",
      secondaryActionLabel: null,
      timeline: [
        { label: "Auth", value: "Retry required", complete: false },
        { label: "SDK", value: "Browser player idle", complete: false },
        { label: "Transfer", value: "No active device", complete: false },
      ],
    };
  }

  if (!isAuthorized) {
    return {
      statusLabel: "Disconnected",
      statusCopy: "Authorization Code with PKCE is still missing.",
      primaryActionLabel: "Connect Spotify",
      primaryActionKind: "authorize",
      secondaryActionLabel: null,
      timeline: [
        { label: "Auth", value: "PKCE required", complete: false },
        { label: "SDK", value: "Browser player idle", complete: false },
        { label: "Transfer", value: "No active device", complete: false },
      ],
    };
  }

  if (spotify.accountTier === "free") {
    return {
      statusLabel: "Premium Required",
      statusCopy: "Spotify Web Playback SDK requires a Premium account for browser playback.",
      primaryActionLabel: "Premium Required",
      primaryActionKind: "disabled",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        { label: "SDK", value: "Premium required", complete: false },
        { label: "Transfer", value: "Playback blocked", complete: false },
      ],
    };
  }

  if (spotify.sdkStatus === "loading") {
    return {
      statusLabel: "Initializing",
      statusCopy: "Account is ready, browser player is loading the Spotify Web Playback SDK.",
      primaryActionLabel: "Initializing Player",
      primaryActionKind: "disabled",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        { label: "SDK", value: "Loading player", complete: false },
        { label: "Transfer", value: "Awaiting device", complete: false },
      ],
    };
  }

  if (spotify.sdkStatus === "error") {
    return {
      statusLabel: "Player Error",
      statusCopy: spotify.lastError ?? "Spotify browser player failed to initialize.",
      primaryActionLabel: "Retry Web Player",
      primaryActionKind: "initialize",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        { label: "SDK", value: "Retry required", complete: false },
        { label: "Transfer", value: "Awaiting active device", complete: false },
      ],
    };
  }

  if (!isSdkReady) {
    return {
      statusLabel: spotify.sdkStatus === "not_ready" ? "Player Offline" : "Connected",
      statusCopy:
        spotify.sdkStatus === "not_ready"
          ? "Browser player was registered, but Spotify marked the device unavailable."
          : "Account is ready, browser player still needs SDK boot.",
      primaryActionLabel: "Initialize Web Player",
      primaryActionKind: "initialize",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        {
          label: "SDK",
          value: spotify.sdkStatus === "not_ready" ? "Device unavailable" : "Loading player",
          complete: false,
        },
        { label: "Transfer", value: "Awaiting device", complete: false },
      ],
    };
  }

  if (spotify.transferStatus === "pending") {
    return {
      statusLabel: "Transferring",
      statusCopy: "Browser device exists and Spotify Connect transfer is still being applied.",
      primaryActionLabel: "Transfer In Progress",
      primaryActionKind: "disabled",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        { label: "SDK", value: spotify.deviceName, complete: true },
        { label: "Transfer", value: "Transfer pending", complete: false },
      ],
    };
  }

  if (!isTransferred) {
    return {
      statusLabel: "SDK Ready",
      statusCopy: "Browser device exists, playback still runs elsewhere.",
      primaryActionLabel: "Transfer Playback Here",
      primaryActionKind: "transfer",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        { label: "SDK", value: spotify.deviceName, complete: true },
        { label: "Transfer", value: "Awaiting active device", complete: false },
      ],
    };
  }

  return {
    statusLabel: "Active Device",
    statusCopy: "Browser player is the current Spotify Connect target.",
    primaryActionLabel: "Browser Player Active",
    primaryActionKind: "active",
    secondaryActionLabel: "Disconnect",
    timeline: [
      { label: "Auth", value: "Token granted", complete: true },
      { label: "SDK", value: spotify.deviceName, complete: true },
      { label: "Transfer", value: "Playback transferred", complete: true },
    ],
  };
}
