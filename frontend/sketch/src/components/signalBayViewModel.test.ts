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
      { label: "Current", value: "42 cm" },
      { label: "Trend", value: "Approaching" },
      { label: "Average", value: "81 cm" },
      { label: "Claps today", value: "14" },
    ]);
    expect(model.summaryChips).toContain("RSSI -65 dBm");
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
    expect(model.systemHealth[1].tone).toBe("soft");
    expect(model.systemHealth[2].status).toBe("High broker jitter");
  });
});
