import { describe, expect, it } from "vitest";
import { applyJukeboxCommand } from "./jukeboxReducer";
import { mockJukeboxState } from "./mockJukeboxState";

describe("applyJukeboxCommand", () => {
  it("advances to the next track in the queue", () => {
    const nextState = applyJukeboxCommand(mockJukeboxState, { type: "next" });

    expect(nextState.media.activeTrackId).toBe(2);
    expect(nextState.media.activeTrack.title).toBe("Midnight Groove");
  });

  it("clamps seek and volume commands into the allowed 0-100 range", () => {
    const overSeekState = applyJukeboxCommand(mockJukeboxState, {
      type: "seek",
      progressPercent: 140,
    });
    const underVolumeState = applyJukeboxCommand(mockJukeboxState, {
      type: "set_volume",
      volumePercent: -12,
    });

    expect(overSeekState.media.progressPercent).toBe(100);
    expect(underVolumeState.media.volumePercent).toBe(0);
  });

  it("ignores play_track commands for unknown track ids", () => {
    const unchangedState = applyJukeboxCommand(mockJukeboxState, {
      type: "play_track",
      trackId: 999,
    });

    expect(unchangedState).toBe(mockJukeboxState);
  });
});
