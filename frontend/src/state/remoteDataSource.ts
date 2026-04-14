import { applyJukeboxCommand } from "./jukeboxReducer";
import { mockJukeboxState } from "./mockJukeboxState";
import {
  buildJukeboxStateFromRemoteSnapshots,
  deriveConnectionStatus,
} from "./remoteMappers";
import type {
  BackendSnapshot,
  HomeAssistantTelemetrySnapshot,
  RemoteJukeboxTransports,
} from "./remoteContracts";
import type {
  JukeboxAppState,
  JukeboxCommand,
  JukeboxDataSource,
} from "./jukeboxTypes";

function cloneState(state: JukeboxAppState) {
  return structuredClone(state);
}

function isUiOnlyCommand(command: JukeboxCommand) {
  return (
    command.type === "set_theme" ||
    command.type === "set_dsp_profile" ||
    command.type === "set_spotify_connection" ||
    command.type === "spotify_initialize" ||
    command.type === "spotify_sdk_ready" ||
    command.type === "spotify_sdk_not_ready" ||
    command.type === "spotify_sdk_error" ||
    command.type === "spotify_playback_state_changed"
  );
}

export class RemoteJukeboxDataSource implements JukeboxDataSource {
  private currentState: JukeboxAppState;
  private listeners = new Set<(state: JukeboxAppState) => void>();
  private readonly transports: RemoteJukeboxTransports;

  constructor(
    transports: RemoteJukeboxTransports,
    initialState: JukeboxAppState = mockJukeboxState,
  ) {
    this.transports = transports;
    this.currentState = cloneState(initialState);
  }

  async getInitialState() {
    const [haResult, backendResult] = await Promise.allSettled([
      this.transports.ha.loadSnapshot(),
      this.transports.backend.loadSnapshot(),
    ]);

    if (
      haResult.status === "rejected" &&
      backendResult.status === "rejected"
    ) {
      throw new Error("Failed to load both Home Assistant and backend state.");
    }

    this.currentState = buildJukeboxStateFromRemoteSnapshots(this.currentState, {
      ha: haResult.status === "fulfilled" ? haResult.value : undefined,
      backend:
        backendResult.status === "fulfilled" ? backendResult.value : undefined,
      entityMap: this.transports.entityMap,
    });

    if (
      haResult.status === "rejected" ||
      backendResult.status === "rejected"
    ) {
      this.currentState = {
        ...this.currentState,
        connectionStatus: deriveConnectionStatus(
          haResult.status === "fulfilled"
            ? haResult.value.connectionStatus
            : "error",
          backendResult.status === "fulfilled"
            ? backendResult.value.connectionStatus
            : "error",
        ),
      };
    }

    return cloneState(this.currentState);
  }

  async sendCommand(command: JukeboxCommand) {
    if (command.type === "spotify_authorize") {
      const previousState = this.currentState;
      this.currentState = applyJukeboxCommand(this.currentState, command);
      this.emit();

      try {
        await this.transports.backend.startSpotifyLogin();
      } catch (error) {
        this.currentState = previousState;
        this.emit();
        throw error;
      }

      return;
    }

    if (command.type === "spotify_transfer_playback") {
      const deviceId = this.currentState.spotify.deviceId;
      const deviceName = this.currentState.spotify.deviceName;

      if (!deviceId) {
        throw new Error("Spotify browser device is not ready.");
      }

      const previousState = this.currentState;
      this.currentState = applyJukeboxCommand(this.currentState, command);
      this.emit();

      try {
        await this.transports.backend.transferSpotifyPlayback({
          deviceId,
          deviceName,
          play: true,
        });
        await this.refreshBackendSnapshot();
      } catch (error) {
        this.currentState = previousState;
        this.emit();
        throw error;
      }

      return;
    }

    if (command.type === "spotify_disconnect") {
      const previousState = this.currentState;

      try {
        await this.transports.backend.disconnectSpotify();
        this.currentState = applyJukeboxCommand(this.currentState, command);
        await this.refreshBackendSnapshot();
      } catch (error) {
        this.currentState = previousState;
        this.emit();
        throw error;
      }

      return;
    }

    if (isUiOnlyCommand(command)) {
      this.currentState = applyJukeboxCommand(this.currentState, command);
      this.emit();
      return;
    }

    await this.transports.backend.sendCommand(command);
    this.currentState = applyJukeboxCommand(this.currentState, command);
    this.emit();
  }

  async subscribe(onState: (state: JukeboxAppState) => void) {
    this.listeners.add(onState);
    onState(cloneState(this.currentState));

    const cleanups = await Promise.all([
      this.subscribeToHa(),
      this.subscribeToBackend(),
    ]);

    return () => {
      this.listeners.delete(onState);
      cleanups.forEach((cleanup) => cleanup?.());
    };
  }

  private async subscribeToHa() {
    if (!this.transports.ha.subscribe) {
      return undefined;
    }

    return this.transports.ha.subscribe((snapshot) => {
      this.applySnapshot({ ha: snapshot });
    });
  }

  private async subscribeToBackend() {
    if (!this.transports.backend.subscribe) {
      return undefined;
    }

    return this.transports.backend.subscribe((snapshot) => {
      this.applySnapshot({ backend: snapshot });
    });
  }

  private applySnapshot(snapshots: {
    ha?: HomeAssistantTelemetrySnapshot;
    backend?: BackendSnapshot;
  }) {
    this.currentState = buildJukeboxStateFromRemoteSnapshots(this.currentState, {
      ...snapshots,
      entityMap: this.transports.entityMap,
    });
    this.emit();
  }

  private async refreshBackendSnapshot() {
    const backendSnapshot = await this.transports.backend.loadSnapshot();
    this.applySnapshot({ backend: backendSnapshot });
  }

  private emit() {
    const snapshot = cloneState(this.currentState);
    this.listeners.forEach((listener) => {
      listener(snapshot);
    });
  }
}
