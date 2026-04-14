import { useEffect, useRef } from "react";
import { fetchSpotifyAccessToken } from "./backendHttpTransport";
import type { JukeboxCommand, JukeboxTrack, SpotifyState } from "./jukeboxTypes";

interface SpotifyPlayerStatePayload {
  paused: boolean;
  position: number;
  duration: number;
  track_window?: {
    current_track?: {
      id?: string;
      name?: string;
      album?: {
        name?: string;
        images?: Array<{ url?: string }>;
      };
      artists?: Array<{ name?: string }>;
    };
  };
}

interface SpotifyPlayerTrackPayload {
  id?: string;
  name?: string;
  album?: {
    name?: string;
    images?: Array<{ url?: string }>;
  };
  artists?: Array<{ name?: string }>;
}

interface SpotifyPlayerListenerPayload {
  device_id?: string;
  message?: string;
}

interface SpotifyPlayerLike {
  addListener(
    event: string,
    callback: (payload: SpotifyPlayerListenerPayload | SpotifyPlayerStatePayload | null) => void,
  ): boolean;
  connect(): Promise<boolean>;
  disconnect(): void;
}

declare global {
  interface Window {
    Spotify?: {
      Player: new (options: {
        name: string;
        getOAuthToken: (callback: (token: string) => void) => void;
        volume?: number;
      }) => SpotifyPlayerLike;
    };
    onSpotifyWebPlaybackSDKReady?: () => void;
  }
}

let spotifySdkPromise: Promise<void> | null = null;

function hashTrackId(value: string) {
  let hash = 0;

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash || 1;
}

function formatDurationLabel(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function mapSpotifyTrack(
  payload: SpotifyPlayerTrackPayload | undefined,
  durationMs: number,
): JukeboxTrack | null {
  if (!payload?.name) {
    return null;
  }

  const trackId = payload.id?.trim() ? hashTrackId(payload.id) : 900;
  const durationLabel = formatDurationLabel(durationMs);

  return {
    id: trackId,
    title: payload.name,
    artist:
      payload.artists
        ?.map((artist: { name?: string }) => artist.name?.trim())
        .filter((value: string | undefined): value is string => Boolean(value))
        .join(", ") || "Spotify",
    album: payload.album?.name?.trim() || "Spotify",
    duration: durationLabel,
    coverUrl:
      payload.album?.images?.[0]?.url || "/covers/midnight-groove.png",
  };
}

function loadSpotifySdk() {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Spotify Web Playback SDK requires a browser."));
  }

  if (window.Spotify?.Player) {
    return Promise.resolve();
  }

  if (spotifySdkPromise) {
    return spotifySdkPromise;
  }

  spotifySdkPromise = new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://sdk.scdn.co/spotify-player.js"]',
    );

    window.onSpotifyWebPlaybackSDKReady = () => {
      resolve();
    };

    if (existingScript) {
      existingScript.addEventListener("error", () => {
        reject(new Error("Failed to load Spotify Web Playback SDK."));
      });
      return;
    }

    const script = document.createElement("script");
    script.src = "https://sdk.scdn.co/spotify-player.js";
    script.async = true;
    script.addEventListener("error", () => {
      reject(new Error("Failed to load Spotify Web Playback SDK."));
    });
    document.body.appendChild(script);
  });

  return spotifySdkPromise;
}

interface UseSpotifyWebPlaybackOptions {
  spotify: SpotifyState;
  sendCommand: (command: JukeboxCommand) => Promise<void>;
}

export function useSpotifyWebPlayback({
  spotify,
  sendCommand,
}: UseSpotifyWebPlaybackOptions) {
  const playerRef = useRef<SpotifyPlayerLike | null>(null);
  const playerNameRef = useRef(spotify.deviceName);

  useEffect(() => {
    playerNameRef.current = spotify.deviceName;
  }, [spotify.deviceName]);

  useEffect(() => {
    return () => {
      playerRef.current?.disconnect();
      playerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (spotify.mockMode !== null || spotify.authStatus !== "disconnected") {
      return;
    }

    playerRef.current?.disconnect();
    playerRef.current = null;
  }, [spotify.authStatus, spotify.mockMode]);

  useEffect(() => {
    if (
      spotify.mockMode !== null ||
      spotify.authStatus !== "connected" ||
      spotify.sdkStatus !== "loading"
    ) {
      return;
    }

    let isCancelled = false;

    const emitSpotifyError = (message: string) => {
      void sendCommand({
        type: "spotify_sdk_error",
        message,
      });
    };

    if (playerRef.current) {
      void playerRef.current.connect().then((connected) => {
        if (!connected) {
          emitSpotifyError("Spotify browser player failed to reconnect.");
        }
      });

      return () => {
        isCancelled = true;
      };
    }

    void loadSpotifySdk()
      .then(() => {
        if (isCancelled || !window.Spotify?.Player) {
          return;
        }

        const player = new window.Spotify.Player({
          name: playerNameRef.current,
          getOAuthToken: (callback) => {
            void fetchSpotifyAccessToken()
              .then((payload) => {
                callback(payload.accessToken);
              })
              .catch((error) => {
                emitSpotifyError(
                  error instanceof Error
                    ? error.message
                    : "Failed to read Spotify access token.",
                );
              });
          },
          volume: 0.72,
        });

        playerRef.current = player;

        player.addListener("ready", (payload) => {
          const listenerPayload = payload as SpotifyPlayerListenerPayload | null;
          void sendCommand({
            type: "spotify_sdk_ready",
            deviceId: listenerPayload?.device_id,
            deviceName: playerNameRef.current,
          });
        });

        player.addListener("not_ready", (payload) => {
          const listenerPayload = payload as SpotifyPlayerListenerPayload | null;
          void sendCommand({
            type: "spotify_sdk_not_ready",
            deviceId: listenerPayload?.device_id,
          });
        });

        player.addListener("player_state_changed", (payload) => {
          const statePayload = payload as SpotifyPlayerStatePayload | null;

          if (!statePayload) {
            return;
          }

          void sendCommand({
            type: "spotify_playback_state_changed",
            currentTrack: mapSpotifyTrack(
              statePayload.track_window?.current_track,
              statePayload.duration ?? 0,
            ),
            positionMs: statePayload.position ?? 0,
            durationMs: statePayload.duration ?? 0,
            isPlaying: !statePayload.paused,
          });
        });

        for (const eventName of [
          "initialization_error",
          "authentication_error",
          "account_error",
          "playback_error",
        ] as const) {
          player.addListener(eventName, (payload) => {
            const listenerPayload = payload as SpotifyPlayerListenerPayload | null;
            emitSpotifyError(
              listenerPayload?.message?.trim() ||
                "Spotify Web Playback SDK error.",
            );
          });
        }

        void player.connect().then((connected) => {
          if (!connected) {
            emitSpotifyError("Spotify browser player failed to connect.");
          }
        });
      })
      .catch((error) => {
        emitSpotifyError(
          error instanceof Error
            ? error.message
            : "Failed to load Spotify Web Playback SDK.",
        );
      });

    return () => {
      isCancelled = true;
    };
  }, [spotify.authStatus, spotify.mockMode, spotify.sdkStatus, sendCommand]);
}
