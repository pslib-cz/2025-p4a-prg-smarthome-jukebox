import type { JukeboxMode, JukeboxTheme } from "./jukeboxTypes";

const MODE_SEQUENCE: JukeboxMode[] = ["idle", "focus", "party", "eco"];

export function normalizeModeLabel(
  value: string | null | undefined,
): JukeboxMode {
  const normalized = value?.trim().toLowerCase() ?? "";

  if (normalized.includes("focus")) {
    return "focus";
  }

  if (normalized.includes("party")) {
    return "party";
  }

  if (normalized.includes("eco")) {
    return "eco";
  }

  return "idle";
}

export function modeToHaLabel(mode: JukeboxMode) {
  switch (mode) {
    case "focus":
      return "Focus armed";
    case "party":
      return "Party";
    case "eco":
      return "Eco";
    default:
      return "Idle";
  }
}

export function modeToTheme(mode: JukeboxMode): JukeboxTheme {
  switch (mode) {
    case "focus":
      return "focus";
    case "party":
      return "disco";
    case "eco":
      return "eco";
    default:
      return "casual";
  }
}

export function modeLabelToTheme(value: string | null | undefined) {
  return modeToTheme(normalizeModeLabel(value));
}

export function nextMode(mode: JukeboxMode): JukeboxMode {
  const currentIndex = MODE_SEQUENCE.indexOf(mode);
  const safeIndex = currentIndex >= 0 ? currentIndex : 0;
  return MODE_SEQUENCE[(safeIndex + 1) % MODE_SEQUENCE.length];
}
