import { describe, expect, it } from "vitest";
import { getLocalTrackStreamUrl } from "./localPlayback";

describe("getLocalTrackStreamUrl", () => {
  it("returns a stream url for a valid local track", () => {
    expect(
      getLocalTrackStreamUrl({
        source: "local",
        activeTrackId: 3,
      }),
    ).toBe("/api/library/tracks/3/stream");
  });

  it("returns null for a spotify source", () => {
    expect(
      getLocalTrackStreamUrl({
        source: "spotify",
        activeTrackId: 3,
      }),
    ).toBeNull();
  });

  it("returns null for an invalid track id", () => {
    expect(
      getLocalTrackStreamUrl({
        source: "local",
        activeTrackId: 0,
      }),
    ).toBeNull();
  });
});
