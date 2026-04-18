import { describe, expect, it } from "vitest";
import {
  ACTIVITY_STREAM_VISIBLE_LIMIT,
  formatActivityEventLog,
  getActivityLineTone,
  getVisibleActivityEvents,
} from "./signalBayEventLog";

describe("signalBayEventLog", () => {
  it("limits visible activity events to the newest six entries", () => {
    const eventLog = Array.from({ length: 8 }, (_, index) => ({
      time: `08:0${index}`,
      action: `Event ${index + 1}`,
      meta: `Meta ${index + 1}`,
    }));

    expect(getVisibleActivityEvents(eventLog)).toHaveLength(
      ACTIVITY_STREAM_VISIBLE_LIMIT,
    );
    expect(getVisibleActivityEvents(eventLog).at(-1)).toMatchObject({
      action: "Event 6",
    });
  });

  it("classifies activity rows by their event tone", () => {
    expect(
      getActivityLineTone({
        time: "08:38",
        action: "HAJukeBox Presence Reason",
        meta: "Clap detected by ESP32",
      }),
    ).toBe("presence");
    expect(
      getActivityLineTone({
        time: "08:39",
        action: "media.play",
        meta: "Track 4 started",
      }),
    ).toBe("media");
    expect(
      getActivityLineTone({
        time: "08:40",
        action: "MQTT status",
        meta: "Broker connected",
      }),
    ).toBe("system");
  });

  it("formats the full activity log for clipboard export", () => {
    expect(
      formatActivityEventLog([
        {
          time: "08:38",
          action: "HAJukeBox Presence Reason",
          meta: "No nearby distance presence -> Clap detected by ESP32",
        },
        {
          time: "08:39",
          action: "media.play",
          meta: "Track 4 started",
        },
      ]),
    ).toBe(
      "08:38 | HAJukeBox Presence Reason | No nearby distance presence -> Clap detected by ESP32\n" +
        "08:39 | media.play | Track 4 started",
    );
    expect(formatActivityEventLog([])).toBe("No activity entries available.");
  });
});
