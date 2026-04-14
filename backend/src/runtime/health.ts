import type {
  BackendDependencyHealthSnapshot,
  BackendHomeAssistantBridgeHealthSnapshot,
  BackendMediaLibraryHealthSnapshot,
  BackendRuntimeHealthSnapshot,
  BackendRuntimeStatus,
  BackendSpotifyHealthSnapshot,
} from "./types.js";

function hasNonReadyDependency(
  dependency: BackendDependencyHealthSnapshot,
) {
  return dependency.status !== "ready";
}

export function deriveBackendRuntimeStatus(
  mediaLibrary: BackendMediaLibraryHealthSnapshot,
  haBridge: BackendHomeAssistantBridgeHealthSnapshot,
  _spotify: BackendSpotifyHealthSnapshot,
): BackendRuntimeStatus {
  if (mediaLibrary.status === "unavailable") {
    return "unavailable";
  }

  if (hasNonReadyDependency(mediaLibrary) || hasNonReadyDependency(haBridge)) {
    return "degraded";
  }

  return "ok";
}

export function createBackendRuntimeHealthSnapshot(
  mediaLibrary: BackendMediaLibraryHealthSnapshot,
  haBridge: BackendHomeAssistantBridgeHealthSnapshot,
  spotify: BackendSpotifyHealthSnapshot,
  timestamp = new Date().toISOString(),
): BackendRuntimeHealthSnapshot {
  return {
    status: deriveBackendRuntimeStatus(mediaLibrary, haBridge, spotify),
    service: "hajukebox-backend",
    timestamp,
    dependencies: {
      mediaLibrary,
      haBridge,
      spotify,
    },
  };
}
