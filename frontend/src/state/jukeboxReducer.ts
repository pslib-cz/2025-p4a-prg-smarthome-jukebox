import type {
  JukeboxAppState,
  JukeboxCommand,
  JukeboxTrack,
} from "./jukeboxTypes";

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function getQueueIndex(queue: JukeboxTrack[], trackId: number) {
  return queue.findIndex((track) => track.id === trackId);
}

function getTrackById(state: JukeboxAppState, trackId: number) {
  return (
    state.media.queue.find((track) => track.id === trackId) ??
    state.library.songs.find((track) => track.id === trackId)
  );
}

function setActiveTrack(state: JukeboxAppState, trackId: number) {
  const track = getTrackById(state, trackId);

  if (!track) {
    return state;
  }

  return {
    ...state,
    media: {
      ...state.media,
      activeTrackId: track.id,
      activeTrack: track,
    },
  };
}

function cycleTrack(state: JukeboxAppState, direction: "next" | "previous") {
  const { queue, activeTrackId } = state.media;

  if (queue.length === 0) {
    return state;
  }

  const activeIndex = getQueueIndex(queue, activeTrackId);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const nextIndex =
    direction === "next"
      ? (safeIndex + 1) % queue.length
      : (safeIndex - 1 + queue.length) % queue.length;

  return {
    ...state,
    media: {
      ...state.media,
      activeTrackId: queue[nextIndex].id,
      activeTrack: queue[nextIndex],
    },
  };
}

export function applyJukeboxCommand(
  state: JukeboxAppState,
  command: JukeboxCommand,
): JukeboxAppState {
  switch (command.type) {
    case "play":
      return {
        ...state,
        media: {
          ...state.media,
          isPlaying: true,
        },
      };

    case "pause":
      return {
        ...state,
        media: {
          ...state.media,
          isPlaying: false,
        },
      };

    case "next":
      return cycleTrack(state, "next");

    case "previous":
      return cycleTrack(state, "previous");

    case "seek":
      return {
        ...state,
        media: {
          ...state.media,
          progressPercent: clampPercent(command.progressPercent),
        },
      };

    case "set_volume":
      return {
        ...state,
        media: {
          ...state.media,
          volumePercent: clampPercent(command.volumePercent),
        },
      };

    case "set_theme":
      return {
        ...state,
        theme: command.theme,
      };

    case "set_spotify_connection":
      return {
        ...state,
        media: {
          ...state.media,
          spotifyConnected: command.connected,
        },
      };

    case "spotify_authorize":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          authStatus: "authorizing",
          lastError: null,
        },
      };

    case "spotify_initialize":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          authStatus:
            state.spotify.authStatus === "disconnected"
              ? "disconnected"
              : "connected",
          sdkStatus: "loading",
          transferStatus: "idle",
          isActiveDevice: false,
          lastError: null,
        },
      };

    case "spotify_sdk_ready":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          authStatus: "connected",
          sdkStatus: "ready",
          transferStatus:
            state.spotify.transferStatus === "active"
              ? "active"
              : state.spotify.transferStatus,
          deviceId: command.deviceId ?? state.spotify.deviceId ?? "spotify-web-player-1",
          deviceName: command.deviceName ?? state.spotify.deviceName,
          lastError: null,
        },
      };

    case "spotify_sdk_not_ready":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          sdkStatus: "not_ready",
          deviceId: command.deviceId ?? state.spotify.deviceId,
          isActiveDevice: false,
          transferStatus:
            state.spotify.transferStatus === "active" ? "pending" : "idle",
          lastError: null,
        },
      };

    case "spotify_sdk_error":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          authStatus:
            state.spotify.authStatus === "disconnected"
              ? "error"
              : state.spotify.authStatus,
          sdkStatus: "error",
          transferStatus: "error",
          isActiveDevice: false,
          lastError: command.message,
        },
      };

    case "spotify_playback_state_changed":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          authStatus:
            state.spotify.authStatus === "disconnected"
              ? "connected"
              : state.spotify.authStatus,
          currentTrack: command.currentTrack,
          positionMs: Math.max(0, Math.round(command.positionMs)),
          durationMs: Math.max(0, Math.round(command.durationMs)),
          isActiveDevice:
            state.spotify.sdkStatus === "ready" ? true : state.spotify.isActiveDevice,
          transferStatus:
            state.spotify.sdkStatus === "ready"
              ? "active"
              : state.spotify.transferStatus,
          lastError: null,
        },
      };

    case "spotify_transfer_playback":
      return {
        ...state,
        spotify: {
          ...state.spotify,
          authStatus: "connected",
          sdkStatus: state.spotify.sdkStatus === "idle" ? "ready" : state.spotify.sdkStatus,
          transferStatus: "pending",
          isActiveDevice: false,
          lastError: null,
        },
      };

    case "spotify_disconnect":
      return {
        ...state,
        media: {
          ...state.media,
          spotifyConnected: false,
        },
        spotify: {
          ...state.spotify,
          authStatus: "disconnected",
          sdkStatus: "idle",
          transferStatus: "idle",
          accountTier:
            state.spotify.mockMode === null ? "unknown" : state.spotify.accountTier,
          deviceId: null,
          isActiveDevice: false,
          currentTrack: null,
          positionMs: 0,
          durationMs: 0,
          lastError: null,
        },
      };

    case "set_dsp_profile":
      return {
        ...state,
        media: {
          ...state.media,
          audio: {
            ...state.media.audio,
            dspProfile: command.profile,
          },
        },
      };

    case "play_track":
      return setActiveTrack(state, command.trackId);

    default:
      return state;
  }
}
