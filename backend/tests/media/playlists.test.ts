import { describe, expect, it } from "vitest";
import { createLibraryPlaylists } from "../../src/media/playlists.js";
import type { MediaTrack } from "../../src/media/types.js";

const tracks: MediaTrack[] = [
  {
    id: 1,
    title: "Blue Hour",
    artist: "Signal Arcade",
    album: "Night Shift",
    duration: "03:10",
    coverUrl: "/covers/blue-hour.png",
  },
  {
    id: 2,
    title: "Glassline",
    artist: "Signal Arcade",
    album: "Night Shift",
    duration: "04:12",
    coverUrl: "/covers/glassline.png",
  },
  {
    id: 3,
    title: "Morning Fold",
    artist: "Quiet Form",
    album: "Day Bloom",
    duration: "02:54",
    coverUrl: "/covers/morning-fold.png",
  },
];

describe("createLibraryPlaylists", () => {
  it("creates a base playlist covering the full scanned library", () => {
    const playlists = createLibraryPlaylists(tracks, "/srv/music/team-demo");

    expect(playlists[0]).toEqual({
      id: 1,
      name: "team-demo",
      songCount: 3,
      icon: "◉",
      trackIds: [1, 2, 3],
    });
  });

  it("creates album playlists when the library spans multiple albums", () => {
    const playlists = createLibraryPlaylists(tracks, "/srv/music/team-demo");

    expect(playlists).toHaveLength(3);
    expect(playlists[1]).toMatchObject({
      name: "Day Bloom",
      songCount: 1,
      trackIds: [3],
    });
    expect(playlists[2]).toMatchObject({
      name: "Night Shift",
      songCount: 2,
      trackIds: [1, 2],
    });
  });

  it("returns an empty list when no tracks are available", () => {
    expect(createLibraryPlaylists([], "/srv/music/team-demo")).toEqual([]);
  });
});
