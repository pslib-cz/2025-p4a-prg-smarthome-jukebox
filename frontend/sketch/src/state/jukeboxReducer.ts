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
) {
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
