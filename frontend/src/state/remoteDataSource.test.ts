import { describe, expect, it, vi } from "vitest";
import { mockJukeboxState } from "./mockJukeboxState";
import { RemoteJukeboxDataSource } from "./remoteDataSource";
import type {
  BackendTransport,
  HomeAssistantTelemetryTransport,
} from "./remoteContracts";
import type { JukeboxAppState } from "./jukeboxTypes";

function createHaTransport(
  overrides: Partial<HomeAssistantTelemetryTransport> = {},
): HomeAssistantTelemetryTransport {
  return {
    async loadSnapshot() {
      return {
        connectionStatus: "connected",
        entities: [],
        eventLog: [],
        mqttFeed: [],
        automationLanes: [],
      };
    },
    async sendModeCommand() {
      return undefined;
    },
    ...overrides,
  };
}

function createBackendTransport(
  overrides: Partial<BackendTransport> = {},
): BackendTransport {
  return {
    async loadSnapshot() {
      return {
        connectionStatus: "connected",
      };
    },
    async sendCommand() {
      return undefined;
    },
    async startSpotifyLogin() {
      return undefined;
    },
    async transferSpotifyPlayback() {
      return undefined;
    },
    async disconnectSpotify() {
      return undefined;
    },
    ...overrides,
  };
}

function captureStates(dataSource: RemoteJukeboxDataSource) {
  const snapshots: JukeboxAppState[] = [];

  return dataSource.subscribe((state) => {
    snapshots.push(state);
  }).then((cleanup) => ({ cleanup, snapshots }));
}

describe("RemoteJukeboxDataSource", () => {
  it("routes set_mode commands through Home Assistant instead of the backend", async () => {
    const sendModeCommand = vi.fn(async () => undefined);
    const sendBackendCommand = vi.fn(async () => undefined);
    const dataSource = new RemoteJukeboxDataSource(
      {
        ha: createHaTransport({ sendModeCommand }),
        backend: createBackendTransport({ sendCommand: sendBackendCommand }),
      },
      mockJukeboxState,
    );
    const { cleanup, snapshots } = await captureStates(dataSource);

    await dataSource.sendCommand({ type: "set_mode", mode: "focus" });

    expect(sendModeCommand).toHaveBeenCalledWith("focus");
    expect(sendBackendCommand).not.toHaveBeenCalled();
    expect(snapshots.at(-1)?.telemetry.presence.lastMode).toBe("Focus armed");
    expect(snapshots.at(-1)?.theme).toBe("focus");

    cleanup();
  });

  it("rolls back the optimistic mode change when Home Assistant rejects it", async () => {
    const dataSource = new RemoteJukeboxDataSource(
      {
        ha: createHaTransport({
          sendModeCommand: vi.fn(async () => {
            throw new Error("HA mode command failed.");
          }),
        }),
        backend: createBackendTransport(),
      },
      mockJukeboxState,
    );
    const { cleanup, snapshots } = await captureStates(dataSource);

    await expect(
      dataSource.sendCommand({ type: "set_mode", mode: "party" }),
    ).rejects.toThrow("HA mode command failed.");

    expect(snapshots.at(-1)?.telemetry.presence.lastMode).toBe(
      mockJukeboxState.telemetry.presence.lastMode,
    );
    expect(snapshots.at(-1)?.theme).toBe(mockJukeboxState.theme);

    cleanup();
  });

  it("keeps playback commands on the backend transport", async () => {
    const sendModeCommand = vi.fn(async () => undefined);
    const sendBackendCommand = vi.fn(async () => undefined);
    const dataSource = new RemoteJukeboxDataSource(
      {
        ha: createHaTransport({ sendModeCommand }),
        backend: createBackendTransport({ sendCommand: sendBackendCommand }),
      },
      mockJukeboxState,
    );

    await dataSource.sendCommand({ type: "play" });

    expect(sendBackendCommand).toHaveBeenCalledWith({ type: "play" });
    expect(sendModeCommand).not.toHaveBeenCalled();
  });
});
