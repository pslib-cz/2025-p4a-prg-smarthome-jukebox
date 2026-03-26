import type {
  MediaPlaylist,
  MediaStateSnapshot,
  MediaTrack,
} from "./types.js";

const tracks: MediaTrack[] = [
  {
    id: 1,
    title: "Midnight Groove",
    artist: "HAJukeBox",
    album: "Local Essentials",
    duration: "03:42",
    coverUrl: "/covers/midnight-groove.png",
  },
  {
    id: 2,
    title: "Sunset Boulevard",
    artist: "HAJukeBox",
    album: "Local Essentials",
    duration: "04:08",
    coverUrl: "/covers/sunset-boulevard.png",
  },
];

const playlists: MediaPlaylist[] = [
  {
    id: 1,
    name: "Baseline Demo",
    songCount: tracks.length,
    icon: "◉",
  },
];

export function getLibraryTracks() {
  return tracks;
}

export function getLibraryPlaylists() {
  return playlists;
}

export function getMediaState(): MediaStateSnapshot {
  const activeTrack = tracks[0];

  return {
    source: "local",
    sourceLabel: "Local MP3",
    spotifyConnected: false,
    isPlaying: false,
    progressPercent: 0,
    positionMs: 0,
    durationMs: 222_000,
    volumePercent: 72,
    activeTrackId: activeTrack.id,
    activeTrack,
    queue: tracks,
    audio: {
      quality: "Ready",
      codec: "MP3",
      bufferPercent: 100,
      dspProfile: "Flat",
    },
  };
}
