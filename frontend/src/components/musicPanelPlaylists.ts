import type { JukeboxPlaylist, JukeboxTrack } from "../state/jukeboxTypes";

export function findPlaylistById(
  playlists: JukeboxPlaylist[],
  playlistId: number | null,
) {
  if (playlistId === null) {
    return null;
  }

  return playlists.find((playlist) => playlist.id === playlistId) ?? null;
}

export function getPlaylistTracks(
  playlist: JukeboxPlaylist,
  songs: JukeboxTrack[],
) {
  const songsById = new Map(songs.map((song) => [song.id, song]));

  return playlist.trackIds.flatMap((trackId) => {
    const track = songsById.get(trackId);
    return track ? [track] : [];
  });
}

export function getPlaylistLeadTrack(
  playlist: JukeboxPlaylist,
  songs: JukeboxTrack[],
) {
  return getPlaylistTracks(playlist, songs)[0] ?? null;
}
