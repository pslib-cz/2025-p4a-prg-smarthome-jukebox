import type { SpotifyState } from "../state/jukeboxTypes";

export interface SpotifyPanelViewModel {
  statusLabel: string;
  statusCopy: string;
  primaryActionLabel: string;
  primaryActionKind: "authorize" | "initialize" | "transfer" | "active";
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

  if (!isSdkReady) {
    return {
      statusLabel: "Connected",
      statusCopy: "Account is ready, browser player still needs SDK boot.",
      primaryActionLabel: "Initialize Web Player",
      primaryActionKind: "initialize",
      secondaryActionLabel: "Disconnect",
      timeline: [
        { label: "Auth", value: "Token granted", complete: true },
        { label: "SDK", value: "Loading player", complete: false },
        { label: "Transfer", value: "Awaiting device", complete: false },
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
