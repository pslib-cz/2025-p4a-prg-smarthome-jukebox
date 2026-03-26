import { useEffect, useRef } from "react";
import { getLocalTrackStreamUrl } from "./localPlayback";
import type { JukeboxCommand, MediaState } from "./jukeboxTypes";

interface LocalAudioPlaybackOptions {
  media: MediaState;
  sendCommand: (command: JukeboxCommand) => Promise<void>;
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

    if (!audio) {
      return;
    }

    const handleEnded = () => {
      void sendCommand({ type: "next" });
    };

    audio.addEventListener("ended", handleEnded);
    return () => {
      audio.removeEventListener("ended", handleEnded);
    };
  }, [sendCommand]);

  return {
    audioRef,
  };
}
