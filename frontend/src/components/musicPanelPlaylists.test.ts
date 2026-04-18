import { describe, expect, it } from "vitest";
import type { JukeboxPlaylist, JukeboxTrack } from "../state/jukeboxTypes";
import {
  findPlaylistById,
  getPlaylistLeadTrack,
  getPlaylistTracks,
} from "./musicPanelPlaylists";

const songs: JukeboxTrack[] = [
  {
    id: 11,
    title: "Blue Hour",
    artist: "Signal Arcade",
    album: "Night Shift",
    duration: "03:10",
    coverUrl: "/covers/blue-hour.png",
  },
  {
    id: 22,
    title: "Static Bloom",
    artist: "Signal Arcade",
    album: "Night Shift",
    duration: "02:58",
    coverUrl: "/covers/static-bloom.png",
  },
  {
    id: 33,
    title: "Low Tide",
    artist: "Quiet Form",
    album: "Morning Glass",
    duration: "04:01",
    coverUrl: "/covers/low-tide.png",
  },
];

function createPlaylist(overrides: Partial<JukeboxPlaylist> = {}): JukeboxPlaylist {
  return {
    id: 1,
    name: "Focus Lane",
    songCount: 3,
    icon: "◉",
    trackIds: [22, 11, 33],
    ...overrides,
  };
}

describe("musicPanelPlaylists", () => {
  it("returns playlist tracks in playlist order", () => {
    const tracks = getPlaylistTracks(createPlaylist(), songs);

    expect(tracks.map((track) => track.id)).toEqual([22, 11, 33]);
  });

  it("ignores missing track ids when resolving playlist tracks", () => {
    const tracks = getPlaylistTracks(
      createPlaylist({
        trackIds: [33, 999, 11],
      }),
      songs,
    );

    expect(tracks.map((track) => track.id)).toEqual([33, 11]);
  });

  it("finds playlist metadata and exposes the lead track", () => {
    const playlist = findPlaylistById(
      [createPlaylist(), createPlaylist({ id: 2, name: "Party Lane" })],
      1,
    );

    expect(playlist?.name).toBe("Focus Lane");
    expect(getPlaylistLeadTrack(playlist!, songs)?.id).toBe(22);
    expect(findPlaylistById([createPlaylist()], 999)).toBeNull();
  });
});
