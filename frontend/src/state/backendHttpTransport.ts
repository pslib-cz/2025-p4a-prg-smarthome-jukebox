import type {
  BackendLogPayload,
  BackendMediaStatePayload,
  BackendPlaylistPayload,
  BackendSnapshot,
  BackendTrackPayload,
  BackendTransport,
} from "./remoteContracts";
import type { EventLogItem, JukeboxCommand } from "./jukeboxTypes";

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  const response = await fetch(input, init);

  if (!response.ok) {
    throw new Error(`Backend request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function mapBackendLogEntry(entry: BackendLogPayload): EventLogItem {
  return {
    time: entry.time,
    action: entry.action,
    meta: entry.meta,
  };
}

export function buildTrackStreamUrl(trackId: number) {
  return `/api/library/tracks/${trackId}/stream`;
}

export function createBackendHttpTransport(): BackendTransport {
  return {
    async loadSnapshot(): Promise<BackendSnapshot> {
      const [media, songs, playlists, recentLogs] = await Promise.all([
        readJson<BackendMediaStatePayload>("/api/media/state"),
        readJson<BackendTrackPayload[]>("/api/library/tracks"),
        readJson<BackendPlaylistPayload[]>("/api/library/playlists"),
        readJson<BackendLogPayload[]>("/api/logs/recent"),
      ]);

      return {
        connectionStatus: "connected",
        media,
        library: {
          songs,
          playlists,
        },
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
        throw new Error(`Backend command failed: ${response.status}`);
      }
    },
  };
}
