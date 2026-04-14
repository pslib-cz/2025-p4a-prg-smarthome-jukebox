import type { JukeboxTrack, SpotifyState } from "./state/jukeboxTypes";

export const SPOTIFY_REQUIRED_SCOPES = [
  "streaming",
  "user-read-private",
  "user-read-email",
  "user-read-playback-state",
  "user-read-currently-playing",
  "user-modify-playback-state",
] as const;

export const SPOTIFY_SKETCH_TRACK: JukeboxTrack = {
  id: 901,
  title: "Satellite Hearts",
  artist: "Signal Arcade",
  album: "Browser Playback",
  duration: "3:35",
  coverUrl: "/covers/midnight-groove.png",
};

export const INITIAL_SPOTIFY_STATE: SpotifyState = {
  configured: true,
  authStatus: "disconnected",
  sdkStatus: "idle",
  transferStatus: "idle",
  accountTier: "premium",
  deviceId: null,
  deviceName: "HAJukeBox Web Player",
  isActiveDevice: false,
  lastError: null,
  currentTrack: SPOTIFY_SKETCH_TRACK,
  positionMs: 64200,
  durationMs: 215000,
  scopes: [...SPOTIFY_REQUIRED_SCOPES],
  expiresAt: null,
  mockMode: null,
};
