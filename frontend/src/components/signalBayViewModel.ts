import type { MediaState, TelemetryState } from "../state/jukeboxTypes";

export interface SignalLevelView {
  label: string;
  value: number;
}

export interface ReadoutView {
  label: string;
  value: string;
}

export interface SystemHealthView {
  label: string;
  value: string;
  status: string;
  tone: "good" | "accent" | "soft";
}

export interface AudioTelemetryView {
  label: string;
  value: string;
}

export interface DistanceChartPoint {
  time: string;
  value: number;
  x: number;
  y: number;
}

export interface SignalBayViewModel {
  signalLevels: SignalLevelView[];
  summaryChips: string[];
  roomReadouts: ReadoutView[];
  systemHealth: SystemHealthView[];
  distanceSummary: ReadoutView[];
  clapTrace: number[];
  mqttTopics: string[];
  audioTelemetry: AudioTelemetryView[];
}

const CHART_WIDTH = 360;
const CHART_HEIGHT = 180;
const CHART_PADDING_X = 18;
const CHART_PADDING_Y = 20;
function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseMetricNumber(value: string) {
  const match = value.match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

function getDistanceTrend(series: TelemetryState["distanceSeries"]) {
  if (series.length < 2) {
    return "Stable";
  }

  const firstValue = series[0].value;
  const lastValue = series[series.length - 1].value;
  const delta = lastValue - firstValue;

  if (delta <= -10) {
    return "Approaching";
  }

  if (delta >= 10) {
    return "Leaving";
  }

  return "Stable";
}

function getAverageDistance(series: TelemetryState["distanceSeries"]) {
  if (series.length === 0) {
    return 0;
  }

  const total = series.reduce((sum, point) => sum + point.value, 0);
  return Math.round(total / series.length);
}

function getBrokerLevel(system: TelemetryState["system"]) {
  if (system.mqttStatus.toLowerCase() !== "connected") {
    return 24;
  }

  const latency = parseMetricNumber(system.brokerLatency) ?? 100;
  return clampPercent(100 - latency * 1.2);
}

function getRuleLevel(telemetry: TelemetryState) {
  const activeRules = telemetry.automationLanes.length;
  const eventSignal = Math.min(telemetry.eventLog.length, 4) * 6;

  return clampPercent(48 + activeRules * 10 + eventSignal);
}

function getRssiTone(rssiValue: string) {
  const rssi = parseMetricNumber(rssiValue);

  if (rssi === null) {
    return "soft";
  }

  if (rssi >= -67) {
    return "good";
  }

  if (rssi >= -75) {
    return "accent";
  }

  return "soft";
}

function getLatencyTone(latencyValue: string) {
  const latency = parseMetricNumber(latencyValue);

  if (latency === null) {
    return "soft";
  }

  if (latency <= 25) {
    return "good";
  }

  if (latency <= 60) {
    return "accent";
  }

  return "soft";
}

function getLatencyStatus(latencyValue: string) {
  const latency = parseMetricNumber(latencyValue);

  if (latency === null) {
    return "Latency unknown";
  }

  if (latency <= 25) {
    return "Stable roundtrip";
  }

  if (latency <= 60) {
    return "Moderate broker jitter";
  }

  return "High broker jitter";
}

function buildBufferLevels(bufferPercent: number) {
  const safeBuffer = clampPercent(bufferPercent);

  return Array.from({ length: 8 }, (_, index) =>
    clampPercent(safeBuffer - 24 + index * 6),
  );
}

function stripBufferFromQuality(quality: string) {
  return quality.replace(/\s*·\s*Buffer\s+\d+%/i, "").trim();
}

function formatShortTime(timestamp: string | null | undefined, fallback: string) {
  if (!timestamp) {
    return fallback;
  }

  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRuntimeValue(status: TelemetryState["system"]["backendRuntime"]["status"]) {
  switch (status) {
    case "ok":
      return "OK";
    case "degraded":
      return "Degraded";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unknown";
  }
}

function formatDependencyValue(
  status: TelemetryState["system"]["backendRuntime"]["haBridgeStatus"],
) {
  switch (status) {
    case "ready":
      return "Ready";
    case "disabled":
      return "Disabled";
    case "degraded":
      return "Degraded";
    case "unavailable":
      return "Unavailable";
    default:
      return "Unknown";
  }
}

function summarizeRuntimeReason(reason: string | null, fallback: string) {
  if (!reason) {
    return fallback;
  }

  const normalized = reason.trim().replace(/\.$/u, "");

  if (normalized.length === 0) {
    return fallback;
  }

  if (/not configured/iu.test(normalized)) {
    return "No MQTT bridge configured";
  }

  if (/timed out/iu.test(normalized)) {
    return "MQTT publish timeout";
  }

  if (/offline/iu.test(normalized)) {
    return "MQTT bridge offline";
  }

  if (/failed to publish/iu.test(normalized)) {
    return "Mirror publish failed";
  }

  return normalized.length <= 30 ? normalized : `${normalized.slice(0, 27)}...`;
}

function getBackendRuntimeTone(
  status: TelemetryState["system"]["backendRuntime"]["status"],
): SystemHealthView["tone"] {
  switch (status) {
    case "ok":
      return "good";
    case "degraded":
      return "accent";
    default:
      return "soft";
  }
}

function getHaMirrorTone(
  status: TelemetryState["system"]["backendRuntime"]["haBridgeStatus"],
): SystemHealthView["tone"] {
  switch (status) {
    case "ready":
      return "good";
    case "disabled":
    case "degraded":
      return "accent";
    default:
      return "soft";
  }
}

function getBackendRuntimeStatus(system: TelemetryState["system"]) {
  const runtime = system.backendRuntime;

  if (runtime.status === "ok") {
    return `Updated ${formatShortTime(runtime.updatedAt, "just now")}`;
  }

  return summarizeRuntimeReason(
    runtime.haBridgeReason ?? runtime.mediaLibraryReason,
    "Dependency attention needed",
  );
}

function getHaMirrorStatus(system: TelemetryState["system"]) {
  const runtime = system.backendRuntime;

  if (runtime.haBridgeStatus === "ready") {
    return `Last publish ${formatShortTime(runtime.lastSuccessfulPublishAt, "ready")}`;
  }

  if (runtime.haBridgeStatus === "disabled") {
    return "No MQTT bridge configured";
  }

  return summarizeRuntimeReason(runtime.haBridgeReason, "Mirror attention needed");
}

export function buildDistanceChartPoints(
  series: TelemetryState["distanceSeries"],
): DistanceChartPoint[] {
  if (series.length === 0) {
    return [];
  }

  const values = series.map((point) => point.value);
  const minValue = Math.min(...values);
  const maxValue = Math.max(...values);
  const range = maxValue - minValue || 1;
  const usableWidth = CHART_WIDTH - CHART_PADDING_X * 2;
  const usableHeight = CHART_HEIGHT - CHART_PADDING_Y * 2;

  return series.map((point, index) => {
    const x =
      CHART_PADDING_X +
      (usableWidth * index) / Math.max(series.length - 1, 1);
    const normalized = (point.value - minValue) / range;
    const y = CHART_HEIGHT - CHART_PADDING_Y - normalized * usableHeight;

    return { ...point, x, y };
  });
}

export function buildSignalBayViewModel(
  telemetry: TelemetryState,
  media: MediaState,
): SignalBayViewModel {
  const currentDistance =
    telemetry.distanceSeries[telemetry.distanceSeries.length - 1]?.value ??
    telemetry.presence.distanceCm;

  return {
    signalLevels: [
      { label: "Sensors", value: telemetry.presence.confidencePercent },
      { label: "Broker", value: getBrokerLevel(telemetry.system) },
      { label: "Rules", value: getRuleLevel(telemetry) },
    ],
    summaryChips: [
      `RSSI ${telemetry.system.rssiDbm}`,
      telemetry.system.mqttSecurity,
      `Uptime ${telemetry.system.uptime}`,
    ],
    roomReadouts: [
      { label: "Visitor range", value: `${telemetry.presence.distanceCm} cm` },
      { label: "Fusion source", value: telemetry.presence.reason },
      { label: "Last clap", value: telemetry.presence.lastClapAt },
      { label: "Last mode", value: telemetry.presence.lastMode },
      { label: "Voice source", value: telemetry.voiceAssistant.source },
      { label: "Last voice", value: telemetry.voiceAssistant.command },
    ],
    systemHealth: [
      {
        label: "Backend runtime",
        value: formatRuntimeValue(telemetry.system.backendRuntime.status),
        status: getBackendRuntimeStatus(telemetry.system),
        tone: getBackendRuntimeTone(telemetry.system.backendRuntime.status),
      },
      {
        label: "HA mirror",
        value: formatDependencyValue(telemetry.system.backendRuntime.haBridgeStatus),
        status: getHaMirrorStatus(telemetry.system),
        tone: getHaMirrorTone(telemetry.system.backendRuntime.haBridgeStatus),
      },
      {
        label: "ESP32 RSSI",
        value: telemetry.system.rssiDbm,
        status:
          getRssiTone(telemetry.system.rssiDbm) === "good"
            ? "Strong signal"
            : "Watch signal margin",
        tone: getRssiTone(telemetry.system.rssiDbm),
      },
      {
        label: "MQTT status",
        value: telemetry.system.mqttStatus,
        status: telemetry.system.mqttSecurity,
        tone:
          telemetry.system.mqttStatus.toLowerCase() === "connected"
            ? "good"
            : "soft",
      },
      {
        label: "Broker latency",
        value: telemetry.system.brokerLatency,
        status: getLatencyStatus(telemetry.system.brokerLatency),
        tone: getLatencyTone(telemetry.system.brokerLatency),
      },
      {
        label: "Uptime",
        value: telemetry.system.uptime,
        status: "No restarts",
        tone: "soft",
      },
    ],
    distanceSummary: [
      { label: "Current", value: `${currentDistance} cm` },
      { label: "Trend", value: getDistanceTrend(telemetry.distanceSeries) },
      {
        label: "Average",
        value: `${getAverageDistance(telemetry.distanceSeries)} cm`,
      },
      {
        label: "Claps today",
        value: `${telemetry.presence.clapCountToday}`,
      },
    ],
    clapTrace: telemetry.clapTrace,
    mqttTopics: Array.from(
      new Set(telemetry.mqttFeed.map((entry) => entry.topic)),
    ).slice(0, 4),
    audioTelemetry: [
      { label: "Source", value: media.sourceLabel },
      {
        label: "Quality",
        value: stripBufferFromQuality(media.audio.quality),
      },
      { label: "Codec", value: media.audio.codec },
      {
        label: "Buffer",
        value: `${media.audio.bufferPercent}% primed`,
      },
    ].map((item) =>
      item.label === "Buffer"
        ? item
        : {
            ...item,
            value: item.value || "Unavailable",
          },
    ),
  };
}

export { buildBufferLevels };
