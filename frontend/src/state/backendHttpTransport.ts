import type {
  BackendErrorPayload,
  BackendHealthPayload,
  BackendLogPayload,
  BackendMediaStatePayload,
  BackendPlaylistPayload,
  BackendSpotifyPlaybackPayload,
  BackendSpotifySessionPayload,
  BackendSnapshot,
  BackendTrackPayload,
  BackendTransport,
} from "./remoteContracts";
import type { EventLogItem, JukeboxCommand } from "./jukeboxTypes";

const BACKEND_POLL_INTERVAL_MS = 4_000;

async function readBackendError(response: Response) {
  try {
    const body = (await response.json()) as BackendErrorPayload;
    const message = body.error?.message?.trim();
    return message && message.length > 0 ? message : null;
  } catch {
    return null;
  }
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    const message = await readBackendError(response);
    throw new Error(message ?? `Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function fetchSpotifyAccessToken() {
  return readJson<{ accessToken: string; expiresAt: string | null; tokenType: "Bearer" }>(
    "/api/spotify/token",
  );
}

function mapBackendLogEntry(entry: BackendLogPayload): EventLogItem {
  return {
    time: entry.time,
    action: entry.action,
    meta: entry.message?.trim() || entry.meta?.trim() || entry.action,
  };
}

export function buildTrackStreamUrl(trackId: number) {
  return `/api/library/tracks/${trackId}/stream`;
}

export function createBackendHttpTransport(): BackendTransport {
  const transport: BackendTransport = {
    async loadSnapshot(): Promise<BackendSnapshot> {
      const [health, media, songs, playlists, recentLogs, spotifySession, spotifyPlayback] = await Promise.all([
        readJson<BackendHealthPayload>("/api/health"),
        readJson<BackendMediaStatePayload>("/api/media/state"),
        readJson<BackendTrackPayload[]>("/api/library/tracks"),
        readJson<BackendPlaylistPayload[]>("/api/library/playlists"),
        readJson<BackendLogPayload[]>("/api/logs/recent"),
        readJson<BackendSpotifySessionPayload>("/api/spotify/session"),
        readJson<BackendSpotifyPlaybackPayload>("/api/spotify/state"),
      ]);

      return {
        connectionStatus: "connected",
        health,
        media,
        library: {
          songs,
          playlists,
        },
        spotifySession,
        spotifyPlayback,
        eventLog: recentLogs.map(mapBackendLogEntry),
        receivedAt: new Date().toISOString(),
      };
    },

    async sendCommand(command: JukeboxCommand) {
      const response = await fetch("/api/media/command", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const message = await readBackendError(response);
        throw new Error(message ?? `Backend command failed: ${response.status}`);
      }
    },

    async startSpotifyLogin() {
      if (typeof window === "undefined") {
        throw new Error("Spotify login requires a browser environment.");
      }

      window.location.assign("/auth/spotify/login");
    },

    async transferSpotifyPlayback(payload) {
      const response = await fetch("/api/spotify/transfer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await readBackendError(response);
        throw new Error(message ?? `Spotify transfer failed: ${response.status}`);
      }
    },

    async disconnectSpotify() {
      const response = await fetch("/api/spotify/disconnect", {
        method: "POST",
      });

      if (!response.ok) {
        const message = await readBackendError(response);
        throw new Error(message ?? `Spotify disconnect failed: ${response.status}`);
      }
    },

    subscribe(onSnapshot) {
      const intervalId = window.setInterval(() => {
        void transport.loadSnapshot()
          .then((snapshot) => {
            onSnapshot(snapshot);
          })
          .catch(() => {});
      }, BACKEND_POLL_INTERVAL_MS);

      return () => {
        window.clearInterval(intervalId);
      };
    },
  };

  return transport;
}
