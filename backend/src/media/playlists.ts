import path from "node:path";
import type { MediaPlaylist, MediaTrack } from "./types.js";

function humanizePlaylistName(mediaLibraryPath: string) {
  const baseName = path.basename(mediaLibraryPath);
  return baseName.trim().length > 0 ? baseName : "Local Library";
}

function buildBasePlaylist(
  tracks: MediaTrack[],
  mediaLibraryPath: string | null,
): MediaPlaylist {
  return {
    id: 1,
    name: mediaLibraryPath ? humanizePlaylistName(mediaLibraryPath) : "Local Library",
    songCount: tracks.length,
    icon: "◉",
    trackIds: tracks.map((track) => track.id),
  };
}

function buildAlbumPlaylists(
  tracks: MediaTrack[],
  startId: number,
): MediaPlaylist[] {
  const albums = new Map<string, { name: string; trackIds: number[] }>();

  for (const track of tracks) {
    const name = track.album.trim() || "Unknown Album";
    const key = name.toLowerCase();
    const entry = albums.get(key);

    if (entry) {
      entry.trackIds.push(track.id);
      continue;
    }

    albums.set(key, {
      name,
      trackIds: [track.id],
    });
  }

  if (albums.size <= 1) {
    return [];
  }

  return [...albums.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((album, index) => ({
      id: startId + index,
      name: album.name,
      songCount: album.trackIds.length,
      icon: "◎",
      trackIds: [...album.trackIds],
    }));
}

export function createLibraryPlaylists(
  tracks: MediaTrack[],
  mediaLibraryPath: string | null,
): MediaPlaylist[] {
  if (tracks.length === 0) {
    return [];
  }

  const basePlaylist = buildBasePlaylist(tracks, mediaLibraryPath);
  const albumPlaylists = buildAlbumPlaylists(tracks, basePlaylist.id + 1);

  return [basePlaylist, ...albumPlaylists];
}
