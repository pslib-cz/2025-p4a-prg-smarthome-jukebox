import { AUDIO_STATUS_BASE, PLAYLISTS, SONGS } from "../appSketchData";
import {
  AUTOMATION_LANES,
  CLAP_TRACE,
  CLAP_COUNT,
  DISTANCE_SERIES,
  EVENT_TAPE,
  MQTT_FEED,
  PRESENCE_CONFIDENCE,
  PRESENCE_REASON,
} from "../components/signalBayData";
import { INITIAL_SPOTIFY_STATE } from "../spotifySketchData";
import type { JukeboxAppState } from "./jukeboxTypes";

const activeTrack = {
  ...SONGS[0],
  coverUrl: SONGS[0].cover,
};

export const mockJukeboxState: JukeboxAppState = {
  theme: "casual",
  connectionStatus: "connected",
  media: {
    source: "local",
    sourceLabel: "Local Library",
    spotifyConnected: false,
    isPlaying: false,
    progressPercent: 35,
    volumePercent: 75,
    activeTrackId: activeTrack.id,
    activeTrack,
    queue: SONGS.map((song) => ({
      ...song,
      coverUrl: song.cover,
    })),
    audio: {
      quality: AUDIO_STATUS_BASE.primary,
      codec: AUDIO_STATUS_BASE.source,
      bufferPercent: 74,
      dspProfile: "Vocal Clarity",
    },
  },
  library: {
    songs: SONGS.map((song) => ({
      ...song,
      coverUrl: song.cover,
    })),
    playlists: PLAYLISTS.map((playlist) => ({ ...playlist })),
  },
  telemetry: {
    presence: {
      confidencePercent: PRESENCE_CONFIDENCE,
      reason: PRESENCE_REASON,
      distanceCm: 42,
      clapCountToday: CLAP_COUNT,
      lastClapAt: "12:50:10",
      lastMode: "Focus auto-armed",
    },
    distanceSeries: DISTANCE_SERIES,
    clapTrace: CLAP_TRACE,
    mqttFeed: MQTT_FEED,
    eventLog: EVENT_TAPE,
    system: {
      mqttStatus: "Connected",
      mqttSecurity: "Secured (TLS)",
      uptime: "12 h 48 m",
      rssiDbm: "-65 dBm",
      brokerLatency: "18 ms",
    },
    automationLanes: AUTOMATION_LANES,
  },
  spotify: INITIAL_SPOTIFY_STATE,
};
