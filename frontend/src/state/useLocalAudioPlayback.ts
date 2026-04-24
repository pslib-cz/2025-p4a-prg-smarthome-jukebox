import { useEffect, useRef } from "react";
import { getLocalTrackStreamUrl } from "./localPlayback";
import type { JukeboxCommand, MediaState } from "./jukeboxTypes";

interface LocalAudioPlaybackOptions {
  media: MediaState;
  sendCommand: (command: JukeboxCommand) => Promise<void>;
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function toMs(value: number) {
  return Number.isFinite(value) && value > 0 ? Math.round(value * 1000) : 0;
}

export function useLocalAudioPlayback({
  media,
  sendCommand,
}: LocalAudioPlaybackOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamUrl = getLocalTrackStreamUrl(media);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    if (!streamUrl) {
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      return;
    }

    if (audio.dataset.streamUrl !== streamUrl) {
      audio.dataset.streamUrl = streamUrl;
      audio.src = streamUrl;
      audio.load();
    }
  }, [streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !streamUrl) {
      return;
    }

    if (media.isPlaying) {
      void audio.play().catch(() => {});
      return;
    }

    audio.pause();
  }, [media.isPlaying, streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    audio.volume = media.volumePercent / 100;
  }, [media.volumePercent]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio || !streamUrl || !Number.isFinite(audio.duration) || audio.duration <= 0) {
      return;
    }

    const targetPositionMs = Math.max(0, Math.round(media.positionMs ?? 0));
    const currentPositionMs = Math.round(audio.currentTime * 1000);

    if (Math.abs(currentPositionMs - targetPositionMs) <= 1000) {
      return;
    }

    audio.currentTime = Math.min(targetPositionMs / 1000, audio.duration);
  }, [media.positionMs, streamUrl]);

  useEffect(() => {
    const audio = audioRef.current;

    if (!audio) {
      return;
    }

    const handleEnded = () => {
      void sendCommand({ type: "next" });
    };
    const publishPlaybackState = () => {
      const durationMs = toMs(audio.duration);
      const positionMs = toMs(audio.currentTime);
      const progressPercent =
        durationMs > 0 ? clampPercent((positionMs / durationMs) * 100) : 0;

      void sendCommand({
        type: "local_playback_state_changed",
        progressPercent,
        positionMs,
        durationMs,
      });
    };

    audio.addEventListener("loadedmetadata", publishPlaybackState);
    audio.addEventListener("durationchange", publishPlaybackState);
    audio.addEventListener("timeupdate", publishPlaybackState);
    audio.addEventListener("seeked", publishPlaybackState);
    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", publishPlaybackState);
      audio.removeEventListener("durationchange", publishPlaybackState);
      audio.removeEventListener("timeupdate", publishPlaybackState);
      audio.removeEventListener("seeked", publishPlaybackState);
      audio.removeEventListener("ended", handleEnded);
    };
  }, [sendCommand]);

  return {
    audioRef,
  };
}
