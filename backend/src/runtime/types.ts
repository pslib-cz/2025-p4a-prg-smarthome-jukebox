export type RuntimeLogLevel = "info" | "warn" | "error";
export type RuntimeLogDomain = "media" | "library" | "haBridge" | "system";

export type BackendRuntimeStatus = "ok" | "degraded" | "unavailable";
export type BackendDependencyStatus =
  | "ready"
  | "degraded"
  | "unavailable"
  | "disabled";

export interface BackendDependencyHealthSnapshot {
  status: BackendDependencyStatus;
  reason: string | null;
  lastChangedAt: string;
}

export interface BackendMediaLibraryHealthSnapshot
  extends BackendDependencyHealthSnapshot {
  pathConfigured: boolean;
  trackCount: number;
  playlistCount: number;
}

export interface BackendHomeAssistantBridgeHealthSnapshot
  extends BackendDependencyHealthSnapshot {
  configured: boolean;
  brokerUrl: string | null;
  topicPrefix: string | null;
  lastSuccessfulPublishAt: string | null;
}

export interface BackendSpotifyHealthSnapshot
  extends BackendDependencyHealthSnapshot {
  configured: boolean;
  clientIdConfigured: boolean;
  redirectUri: string | null;
  frontendRedirectUri: string | null;
  scopes: string[];
}

export interface BackendRuntimeHealthSnapshot {
  status: BackendRuntimeStatus;
  service: "hajukebox-backend";
  timestamp: string;
  dependencies: {
    mediaLibrary: BackendMediaLibraryHealthSnapshot;
    haBridge: BackendHomeAssistantBridgeHealthSnapshot;
    spotify: BackendSpotifyHealthSnapshot;
  };
}
