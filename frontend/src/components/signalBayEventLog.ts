import type { EventLogItem } from "../state/jukeboxTypes";

export const ACTIVITY_STREAM_VISIBLE_LIMIT = 6;

export type ActivityLineTone = "presence" | "media" | "system" | "generic";

function normalizeEventText(event: EventLogItem) {
  return `${event.action} ${event.meta}`.trim().toLowerCase();
}

export function getVisibleActivityEvents(
  eventLog: EventLogItem[],
  limit = ACTIVITY_STREAM_VISIBLE_LIMIT,
) {
  return eventLog.slice(0, limit);
}

export function getActivityLineTone(event: EventLogItem): ActivityLineTone {
  const normalized = normalizeEventText(event);

  if (
    normalized.includes("presence") ||
    normalized.includes("distance") ||
    normalized.includes("clap") ||
    normalized.includes("ping")
  ) {
    return "presence";
  }

  if (
    normalized.includes("play") ||
    normalized.includes("pause") ||
    normalized.includes("track") ||
    normalized.includes("mode") ||
    normalized.includes("volume")
  ) {
    return "media";
  }

  if (
    normalized.includes("mqtt") ||
    normalized.includes("broker") ||
    normalized.includes("rssi") ||
    normalized.includes("uptime") ||
    normalized.includes("health") ||
    normalized.includes("backend")
  ) {
    return "system";
  }

  return "generic";
}

export function formatActivityEventLog(eventLog: EventLogItem[]) {
  if (eventLog.length === 0) {
    return "No activity entries available.";
  }

  return eventLog
    .map((event) => `${event.time} | ${event.action} | ${event.meta}`)
    .join("\n");
}
