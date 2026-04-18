import { describe, expect, it } from "vitest";
import { mockJukeboxState } from "../state/mockJukeboxState";
import {
  buildDistanceChartPoints,
  buildSignalBayViewModel,
} from "./signalBayViewModel";

describe("buildDistanceChartPoints", () => {
  it("returns a valid chart point even for a single-sample series", () => {
    const points = buildDistanceChartPoints([{ time: "12:00", value: 42 }]);

    expect(points).toHaveLength(1);
    expect(points[0].x).toBe(18);
    expect(points[0].y).toBe(160);
  });
});

describe("buildSignalBayViewModel", () => {
  it("builds dynamic distance and telemetry summaries from state", () => {
    const model = buildSignalBayViewModel(
      mockJukeboxState.telemetry,
      mockJukeboxState.media,
    );

    expect(model.distanceSummary).toEqual([
      { label: "Live range", value: "42 cm" },
      { label: "Motion", value: "Approaching" },
      { label: "Session avg", value: "81 cm" },
      { label: "Claps today", value: "14" },
    ]);
    expect(model.summaryChips).toContain("RSSI -65 dBm");
    expect(model.roomReadouts).toContainEqual({
      label: "Fusion source",
      value: "Mobile + distance detected",
    });
    expect(model.roomReadouts).toContainEqual({
      label: "Last mode",
      value: "Focus auto-armed",
    });
    expect(model.approachState).toEqual({
      label: "Nearby zone",
      detail: "42 cm from the sensor. Approaching inside close-range activation.",
      tone: "good",
    });
    expect(model.systemHealth.find((item) => item.label === "Backend runtime")).toMatchObject({
      label: "Backend runtime",
      value: "OK",
      tone: "good",
    });
    expect(
      model.systemHealth.find((item) => item.label === "Backend runtime")?.status,
    ).toMatch(/^Updated /);
    expect(model.systemHealth.find((item) => item.label === "HA mirror")).toMatchObject({
      label: "HA mirror",
      value: "Ready",
      tone: "good",
    });
    expect(
      model.systemHealth.find((item) => item.label === "HA mirror")?.status,
    ).toMatch(/^Last publish /);
    expect(model.mqttTopics).toEqual([
      "vibe/distance",
      "vibe/presence",
      "vibe/clap",
      "vibe/mode",
    ]);
  });

  it("degrades broker health when MQTT is disconnected", () => {
    const disconnectedState = structuredClone(mockJukeboxState);
    disconnectedState.telemetry.system.mqttStatus = "Disconnected";
    disconnectedState.telemetry.system.mqttSecurity = "Offline";
    disconnectedState.telemetry.system.brokerLatency = "128 ms";

    const model = buildSignalBayViewModel(
      disconnectedState.telemetry,
      disconnectedState.media,
    );

    expect(model.signalLevels[1]).toEqual({ label: "Broker", value: 24 });
    expect(
      model.systemHealth.find((item) => item.label === "MQTT status")?.tone,
    ).toBe("soft");
    expect(
      model.systemHealth.find((item) => item.label === "Broker latency")?.status,
    ).toBe("High broker jitter");
  });

  it("surfaces backend runtime and HA mirror degradation in the system cards", () => {
    const degradedState = structuredClone(mockJukeboxState);
    degradedState.telemetry.system.backendRuntime.status = "degraded";
    degradedState.telemetry.system.backendRuntime.haBridgeStatus = "disabled";
    degradedState.telemetry.system.backendRuntime.haBridgeReason =
      "Home Assistant MQTT bridge is not configured.";
    degradedState.telemetry.system.backendRuntime.lastSuccessfulPublishAt = null;

    const model = buildSignalBayViewModel(
      degradedState.telemetry,
      degradedState.media,
    );

    expect(model.systemHealth.find((item) => item.label === "Backend runtime")).toEqual({
      label: "Backend runtime",
      value: "Degraded",
      status: "No MQTT bridge configured",
      tone: "accent",
    });
    expect(model.systemHealth.find((item) => item.label === "HA mirror")).toEqual({
      label: "HA mirror",
      value: "Disabled",
      status: "No MQTT bridge configured",
      tone: "accent",
    });
  });
});
