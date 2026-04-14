import type { JukeboxProviderStatus } from "./jukeboxContext";
import type { JukeboxAppState, TelemetryState } from "./jukeboxTypes";

export type DataAvailabilityState =
  | "ready"
  | "loading"
  | "empty"
  | "offline"
  | "error";

export type AppShellTone = "good" | "accent" | "warning" | "danger";

export interface AppShellStatusViewModel {
  tone: AppShellTone;
  label: string;
  headline: string;
  copy: string;
  detailChips: string[];
  libraryState: DataAvailabilityState;
  playlistState: DataAvailabilityState;
  telemetryState: DataAvailabilityState;
}

function hasTelemetryPayload(telemetry: TelemetryState) {
  return (
    telemetry.distanceSeries.length > 0 ||
    telemetry.clapTrace.length > 0 ||
    telemetry.mqttFeed.length > 0 ||
    telemetry.eventLog.length > 0 ||
    telemetry.automationLanes.length > 0
  );
}

function resolveCollectionState(
  providerStatus: JukeboxProviderStatus,
  connectionStatus: JukeboxAppState["connectionStatus"],
  hasData: boolean,
): DataAvailabilityState {
  if (hasData) {
    return "ready";
  }

  if (providerStatus === "error" || connectionStatus === "error") {
    return "error";
  }

  if (
    providerStatus === "loading" ||
    connectionStatus === "idle" ||
    connectionStatus === "connecting"
  ) {
    return "loading";
  }

  if (connectionStatus === "disconnected") {
    return "offline";
  }

  return "empty";
}

function buildDetailChips(
  state: JukeboxAppState,
  libraryState: DataAvailabilityState,
  playlistState: DataAvailabilityState,
  telemetryState: DataAvailabilityState,
) {
  const chips: string[] = [];
  const backendRuntime = state.telemetry.system.backendRuntime;

  if (state.connectionStatus === "disconnected") {
    chips.push("Last snapshot only");
  }

  if (backendRuntime.status === "degraded") {
    if (backendRuntime.haBridgeStatus === "disabled") {
      chips.push("HA bridge disabled");
    } else if (backendRuntime.haBridgeStatus === "degraded") {
      chips.push("HA bridge degraded");
    } else if (backendRuntime.mediaLibraryStatus === "degraded") {
      chips.push("Library degraded");
    } else {
      chips.push("Backend degraded");
    }
  } else if (backendRuntime.status === "unavailable") {
    if (backendRuntime.mediaLibraryStatus === "unavailable") {
      chips.push("Library unavailable");
    } else if (backendRuntime.haBridgeStatus === "unavailable") {
      chips.push("HA bridge unavailable");
    } else {
      chips.push("Backend unavailable");
    }
  }

  switch (libraryState) {
    case "ready":
      chips.push(`${state.library.songs.length} local tracks`);
      break;
    case "loading":
      chips.push("Library syncing");
      break;
    case "offline":
      chips.push("Library offline");
      break;
    case "error":
      chips.push("Library unavailable");
      break;
    default:
      chips.push("Local library empty");
      break;
  }

  switch (telemetryState) {
    case "ready":
      chips.push(
        state.telemetry.mqttFeed.length > 0
          ? `${state.telemetry.mqttFeed.length} MQTT lines`
          : "Telemetry hydrated",
      );
      break;
    case "loading":
      chips.push("Telemetry syncing");
      break;
    case "offline":
      chips.push("Telemetry offline");
      break;
    case "error":
      chips.push("Telemetry unavailable");
      break;
    default:
      chips.push("Telemetry waiting");
      break;
  }

  if (playlistState === "ready") {
    chips.push(`${state.library.playlists.length} playlists`);
  } else if (playlistState === "empty") {
    chips.push("No playlists");
  }

  return chips.slice(0, 3);
}

export function buildAppShellStatusViewModel(
  state: JukeboxAppState,
  providerStatus: JukeboxProviderStatus,
  error: string | null,
): AppShellStatusViewModel {
  const backendRuntime = state.telemetry.system.backendRuntime;
  const libraryState = resolveCollectionState(
    providerStatus,
    state.connectionStatus,
    state.library.songs.length > 0,
  );
  const playlistState = resolveCollectionState(
    providerStatus,
    state.connectionStatus,
    state.library.playlists.length > 0,
  );
  const telemetryState = resolveCollectionState(
    providerStatus,
    state.connectionStatus,
    hasTelemetryPayload(state.telemetry),
  );
  const detailChips = buildDetailChips(
    state,
    libraryState,
    playlistState,
    telemetryState,
  );

  if (providerStatus === "error" || state.connectionStatus === "error") {
    return {
      tone: "danger",
      label: "Error",
      headline: "Jukebox link failed",
      copy:
        error ??
        "The provider could not synchronize the shared app state.",
      detailChips,
      libraryState,
      playlistState,
      telemetryState,
    };
  }

  if (
    providerStatus === "loading" ||
    state.connectionStatus === "idle" ||
    state.connectionStatus === "connecting"
  ) {
    return {
      tone: "accent",
      label: "Syncing",
      headline: "Waiting for the first live snapshot",
      copy:
        "The shell is hydrating the shared player and telemetry state.",
      detailChips,
      libraryState,
      playlistState,
      telemetryState,
    };
  }

  if (state.connectionStatus === "disconnected") {
    return {
      tone: "warning",
      label: "Offline",
      headline: "Live updates are paused",
      copy:
        "The UI keeps the last known snapshot until Home Assistant and MQTT reconnect.",
      detailChips,
      libraryState,
      playlistState,
      telemetryState,
    };
  }

  if (backendRuntime.status === "unavailable") {
    return {
      tone: "danger",
      label: "Unavailable",
      headline: "Backend runtime is unavailable",
      copy:
        backendRuntime.mediaLibraryReason ??
        backendRuntime.haBridgeReason ??
        "The backend is reachable, but its runtime baseline is not ready for local playback.",
      detailChips,
      libraryState,
      playlistState,
      telemetryState,
    };
  }

  if (backendRuntime.status === "degraded") {
    return {
      tone: "warning",
      label: "Degraded",
      headline: "Backend runtime is degraded",
      copy:
        backendRuntime.haBridgeReason ??
        backendRuntime.mediaLibraryReason ??
        "One backend dependency needs attention, but the main shell can still operate.",
      detailChips,
      libraryState,
      playlistState,
      telemetryState,
    };
  }

  if (libraryState !== "ready" || telemetryState !== "ready") {
    return {
      tone: "warning",
      label: "Standby",
      headline: "Baseline sources are not complete yet",
      copy:
        "The layout is ready, but local music and telemetry still need their first full payload.",
      detailChips,
      libraryState,
      playlistState,
      telemetryState,
    };
  }

  return {
    tone: "good",
    label: "Live",
    headline: "Frontend synchronized",
    copy:
      "The shell is ready for real local playback and telemetry adapters.",
    detailChips,
    libraryState,
    playlistState,
    telemetryState,
  };
}
