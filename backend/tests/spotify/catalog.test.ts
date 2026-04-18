import { describe, expect, it } from "vitest";
import {
  normalizeSpotifyPlaylistItems,
  normalizeSpotifyPlaylists,
  normalizeSpotifySearchTracks,
} from "../../src/spotify/catalog.js";

describe("spotify catalog normalizers", () => {
  it("maps search track payloads into frontend-safe summaries", () => {
    const page = normalizeSpotifySearchTracks({
      tracks: {
        total: 1,
        limit: 8,
        offset: 0,
        items: [
          {
            id: "track-1",
            uri: "spotify:track:track-1",
            name: "Satellite Hearts",
            duration_ms: 215_000,
            album: {
              name: "Browser Playback",
              images: [{ url: "https://cdn.spotify.test/cover.jpg" }],
            },
            artists: [{ name: "Signal Arcade" }],
            external_urls: {
              spotify: "https://open.spotify.com/track/track-1",
            },
          },
        ],
      },
    });

    expect(page).toEqual({
      items: [
        {
          id: "track-1",
          uri: "spotify:track:track-1",
          title: "Satellite Hearts",
          artist: "Signal Arcade",
          album: "Browser Playback",
          durationMs: 215_000,
          coverUrl: "https://cdn.spotify.test/cover.jpg",
          externalUrl: "https://open.spotify.com/track/track-1",
        },
      ],
      total: 1,
      limit: 8,
      offset: 0,
    });
  });

  it("maps current-user playlist payloads with owner and track count", () => {
    const page = normalizeSpotifyPlaylists({
      total: 1,
      limit: 8,
      offset: 0,
      items: [
        {
          id: "playlist-1",
          uri: "spotify:playlist:playlist-1",
          name: "Late Focus",
          description: "Private focus rotation",
          owner: {
            display_name: "jiri",
          },
          images: [{ url: "https://cdn.spotify.test/playlist.jpg" }],
          tracks: {
            total: 12,
          },
          external_urls: {
            spotify: "https://open.spotify.com/playlist/playlist-1",
          },
        },
      ],
    });

    expect(page.items[0]).toMatchObject({
      id: "playlist-1",
      name: "Late Focus",
      ownerName: "jiri",
      trackCount: 12,
    });
  });

  it("filters unsupported playlist items and keeps only track entries", () => {
    const page = normalizeSpotifyPlaylistItems({
      total: 3,
      limit: 20,
      offset: 0,
      items: [
        {
          is_local: true,
          track: {
            id: "local-track",
            uri: "spotify:track:local-track",
            name: "Local Shadow",
          },
        },
        {
          track: {
            id: "episode-1",
            uri: "spotify:episode:episode-1",
            type: "episode",
            name: "Podcast Intro",
          },
        },
        {
          item: {
            id: "track-2",
            uri: "spotify:track:track-2",
            type: "track",
            name: "Quiet Focus",
            duration_ms: 246_000,
            album: {
              name: "Study Lines",
              images: [{ url: "https://cdn.spotify.test/study-lines.jpg" }],
            },
            artists: [{ name: "Morning Static" }],
          },
        },
      ],
    });

    expect(page.items).toEqual([
      {
        id: "track-2",
        uri: "spotify:track:track-2",
        title: "Quiet Focus",
        artist: "Morning Static",
        album: "Study Lines",
        durationMs: 246_000,
        coverUrl: "https://cdn.spotify.test/study-lines.jpg",
        externalUrl: null,
      },
    ]);
  });
});
