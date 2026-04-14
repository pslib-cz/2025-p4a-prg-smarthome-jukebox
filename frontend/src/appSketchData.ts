export const SONGS = [
  {
    id: 1,
    title: "Neon Dreams",
    artist: "Electric Waves",
    album: "Digital Nights",
    duration: "3:45",
    cover: "/covers/neon-dreams.png",
  },
  {
    id: 2,
    title: "Midnight Groove",
    artist: "The Vinyl Collective",
    album: "After Hours",
    duration: "4:12",
    cover: "/covers/midnight-groove.png",
  },
  {
    id: 3,
    title: "Urban Rhythm",
    artist: "Street Beats",
    album: "City Pulse",
    duration: "3:28",
    cover: "/covers/urban-rhythm.png",
  },
  {
    id: 4,
    title: "Smooth Serenade",
    artist: "Jazz Ensemble",
    album: "Blue Notes",
    duration: "5:03",
    cover: "/covers/smooth-serenade.png",
  },
  {
    id: 5,
    title: "Thunder Road",
    artist: "Rock Legends",
    album: "Storm Rising",
    duration: "4:50",
    cover: "/covers/thunder-road.png",
  },
  {
    id: 6,
    title: "Sunset Boulevard",
    artist: "Indie Hearts",
    album: "Golden Hour",
    duration: "3:55",
    cover: "/covers/sunset-boulevard.png",
  },
] as const;

export const DSP_PRESETS = {
  "Bass Boost": {
    reverb: 22,
    echo: 10,
    delay: 12,
    distortion: 8,
    flanger: 6,
    chorus: 18,
  },
  "Vocal Clarity": {
    reverb: 18,
    echo: 12,
    delay: 16,
    distortion: 0,
    flanger: 8,
    chorus: 20,
  },
  Flat: {
    reverb: 8,
    echo: 0,
    delay: 0,
    distortion: 0,
    flanger: 0,
    chorus: 0,
  },
} as const;

export type DspProfileKey = keyof typeof DSP_PRESETS;

export function isDspProfileKey(value: string): value is DspProfileKey {
  return value in DSP_PRESETS;
}

export const AUDIO_STATUS_BASE = {
  primary: "320 kbps · High · Buffer 74%",
  source: "AAC stream · Local cache",
} as const;

export const PLAYLISTS = [
  { id: 1, name: "Chill Vibes", songCount: 12, icon: "🎧" },
  { id: 2, name: "Night Drive", songCount: 8, icon: "🌙" },
  { id: 3, name: "Workout Mix", songCount: 15, icon: "💪" },
];
