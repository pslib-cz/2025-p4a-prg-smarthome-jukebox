import { describe, expect, it } from "vitest";
import { mockJukeboxState } from "./mockJukeboxState";
import { buildAppShellStatusViewModel } from "./appShellStatus";

describe("buildAppShellStatusViewModel", () => {
  it("marks a healthy connected shell as live", () => {
    const viewModel = buildAppShellStatusViewModel(
      mockJukeboxState,
      "ready",
      null,
    );

    expect(viewModel.label).toBe("Live");
    expect(viewModel.tone).toBe("good");
    expect(viewModel.libraryState).toBe("ready");
    expect(viewModel.telemetryState).toBe("ready");
  });

  it("stays in syncing mode while the provider is loading", () => {
    const viewModel = buildAppShellStatusViewModel(
      mockJukeboxState,
      "loading",
      null,
    );

    expect(viewModel.label).toBe("Syncing");
    expect(viewModel.tone).toBe("accent");
    expect(viewModel.headline).toContain("first live snapshot");
  });

  it("falls back to standby when baseline collections are still empty", () => {
    const emptyState = structuredClone(mockJukeboxState);
    emptyState.library.songs = [];
    emptyState.library.playlists = [];
    emptyState.telemetry.distanceSeries = [];
    emptyState.telemetry.clapTrace = [];
    emptyState.telemetry.mqttFeed = [];
    emptyState.telemetry.eventLog = [];
    emptyState.telemetry.automationLanes = [];

    const viewModel = buildAppShellStatusViewModel(emptyState, "ready", null);

    expect(viewModel.label).toBe("Standby");
    expect(viewModel.libraryState).toBe("empty");
    expect(viewModel.telemetryState).toBe("empty");
    expect(viewModel.detailChips).toContain("Local library empty");
  });

  it("surfaces offline mode when the connection drops before data arrives", () => {
    const disconnectedState = structuredClone(mockJukeboxState);
    disconnectedState.connectionStatus = "disconnected";
    disconnectedState.library.songs = [];
    disconnectedState.library.playlists = [];
    disconnectedState.telemetry.distanceSeries = [];
    disconnectedState.telemetry.clapTrace = [];
    disconnectedState.telemetry.mqttFeed = [];
    disconnectedState.telemetry.eventLog = [];
    disconnectedState.telemetry.automationLanes = [];

    const viewModel = buildAppShellStatusViewModel(
      disconnectedState,
      "ready",
      null,
    );

    expect(viewModel.label).toBe("Offline");
    expect(viewModel.libraryState).toBe("offline");
    expect(viewModel.telemetryState).toBe("offline");
    expect(viewModel.detailChips[0]).toBe("Last snapshot only");
  });

  it("promotes provider failures to an error banner", () => {
    const viewModel = buildAppShellStatusViewModel(
      mockJukeboxState,
      "error",
      "Adapter crashed.",
    );

    expect(viewModel.label).toBe("Error");
    expect(viewModel.tone).toBe("danger");
    expect(viewModel.copy).toContain("Adapter crashed.");
  });
});
