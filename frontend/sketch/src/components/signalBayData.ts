export type SignalTone = "good" | "accent" | "soft";
export type FeedTone = "recv" | "send" | "sys";

export interface SignalLevel {
  label: string;
  value: number;
}

export interface RoomMarker {
  id: string;
  label: string;
  angle: number;
  radius: number;
  tone: SignalTone;
}

export interface Readout {
  label: string;
  value: string;
}

export interface SystemHealthItem {
  label: string;
  value: string;
  status: string;
  tone: SignalTone;
}

export interface DistancePoint {
  time: string;
  value: number;
}

export interface MqttFeedEntry {
  direction: string;
  topic: string;
  payload: string;
  tone: FeedTone;
}

export interface AutomationLane {
  source: string;
  fusion: string;
  action: string;
}

export interface AudioTelemetryItem {
  label: string;
  value: string;
}

export interface DspProfile {
  label: string;
}

export interface EventEntry {
  time: string;
  action: string;
  meta: string;
}

export const SIGNAL_LEVELS: SignalLevel[] = [
  { label: "Sensors", value: 92 },
  { label: "Broker", value: 96 },
  { label: "Rules", value: 84 },
];

export const SUMMARY_CHIPS = ["RSSI -65 dBm", "TLS 1.3", "Uptime 12h 48m"];

export const ROOM_MARKERS: RoomMarker[] = [
  { id: "entry", label: "Entry lane", angle: -34, radius: 126, tone: "accent" },
  { id: "presence", label: "Presence lock", angle: 28, radius: 82, tone: "good" },
  { id: "mobile", label: "Mobile beacon", angle: 78, radius: 112, tone: "soft" },
  { id: "clap", label: "Clap echo", angle: 126, radius: 58, tone: "soft" },
];

export const PRESENCE_CONFIDENCE = 85;
export const PRESENCE_REASON = "Mobile + distance detected";
export const CLAP_COUNT = 14;

export const ROOM_READOUTS: Readout[] = [
  { label: "Visitor range", value: "42 cm" },
  { label: "Fusion source", value: "Phone + ultrasonic" },
  { label: "Last clap", value: "12:50:10" },
  { label: "Last mode", value: "Focus auto-armed" },
];

export const SYSTEM_HEALTH: SystemHealthItem[] = [
  { label: "ESP32 RSSI", value: "-65 dBm", status: "Strong signal", tone: "good" },
  { label: "MQTT status", value: "Connected", status: "Secured (TLS)", tone: "good" },
  { label: "Broker latency", value: "18 ms", status: "Stable roundtrip", tone: "accent" },
  { label: "Uptime", value: "12 h 48 m", status: "No restarts", tone: "soft" },
];

export const DISTANCE_SERIES: DistancePoint[] = [
  { time: "12:42", value: 124 },
  { time: "12:44", value: 118 },
  { time: "12:46", value: 111 },
  { time: "12:48", value: 96 },
  { time: "12:50", value: 84 },
  { time: "12:52", value: 70 },
  { time: "12:54", value: 61 },
  { time: "12:56", value: 55 },
  { time: "12:58", value: 48 },
  { time: "13:00", value: 42 },
];

export const DISTANCE_SUMMARY: Readout[] = [
  { label: "Current", value: "42 cm" },
  { label: "Trend", value: "Approaching" },
  { label: "Average", value: "81 cm" },
  { label: "Claps today", value: `${CLAP_COUNT}` },
];

export const CLAP_TRACE = [14, 22, 34, 28, 62, 86, 100, 73, 38, 26, 18, 22, 44, 72, 91, 76];

export const MQTT_FEED: MqttFeedEntry[] = [
  { direction: "RECV", topic: "vibe/distance", payload: "42 cm", tone: "recv" },
  { direction: "RECV", topic: "vibe/presence", payload: "85% mobile+distance", tone: "recv" },
  { direction: "RECV", topic: "vibe/clap", payload: "DOUBLE_HIT", tone: "recv" },
  { direction: "SEND", topic: "vibe/mode", payload: "focus", tone: "send" },
  { direction: "SEND", topic: "vibe/led/color", payload: "#3db3ff", tone: "send" },
  { direction: "SYS", topic: "mqtt/tls", payload: "Session renewed", tone: "sys" },
  { direction: "SYS", topic: "esp32/uptime", payload: "12h48m", tone: "sys" },
];

export const MQTT_TOPICS = [
  "vibe/distance",
  "vibe/presence",
  "vibe/clap",
  "vibe/mode",
];

export const AUTOMATION_LANES: AutomationLane[] = [
  {
    source: "vibe/presence -> 85% confidence",
    fusion: "Phone beacon + 42 cm lock",
    action: "SEND vibe/mode focus",
  },
  {
    source: "vibe/distance -> under 50 cm",
    fusion: "Entry rule held for 12 s",
    action: "SEND vibe/led/color #3db3ff",
  },
  {
    source: "vibe/clap -> double hit",
    fusion: "Noise floor validated",
    action: "LOG event + arm voice entry",
  },
];

export const AUDIO_TELEMETRY: AudioTelemetryItem[] = [
  { label: "Source", value: "Local cache" },
  { label: "Quality", value: "320 kbps / High" },
  { label: "Codec", value: "AAC stream" },
  { label: "Buffer", value: "74% primed" },
];

export const DSP_PROFILES: DspProfile[] = [
  { label: "Bass Boost" },
  { label: "Vocal Clarity" },
  { label: "Flat" },
];

export const BUFFER_LEVELS = [40, 58, 66, 74, 74, 74, 74, 74];

export const EVENT_TAPE: EventEntry[] = [
  {
    time: "12:45:02",
    action: "Focus mode activated by proximity",
    meta: "Presence confidence crossed 80% with 42 cm lock",
  },
  {
    time: "12:50:10",
    action: "Voice entry armed after clap confirmation",
    meta: "Double clap validated above noise threshold",
  },
  {
    time: "12:52:36",
    action: "MQTT session refreshed without packet loss",
    meta: "TLS tunnel stayed secured during broker keepalive",
  },
  {
    time: "12:55:00",
    action: "Emergency shutdown staged after room exit",
    meta: "Presence fell below 20% and distance drift exceeded 120 cm",
  },
];
