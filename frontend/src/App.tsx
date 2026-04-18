import { useCallback, useRef, useState } from "react";
import "./App.css";
import "./AppShell.css";
import "./components/HeroStage.css";
import VerticalFader from "./components/VerticalFader";
import HorizontalSlider from "./components/HorizontalSlider";
import VinylRecord from "./components/VinylRecord";
import DiscoParticles from "./components/DiscoParticles";
import SignalBay from "./components/SignalBay";
import MusicPanel from "./components/MusicPanel";
import SpotifyPage from "./components/SpotifyPage";
import {
  DSP_PRESETS,
  isDspProfileKey,
  type DspProfileKey,
} from "./appSketchData";
import {
  VolumeIcon,
  BassIcon,
  TrebleIcon,
  MixerIcon,
  SparkleIcon,
  PlayIcon,
  PauseIcon,
  PrevIcon,
  NextIcon,
  CasualIcon,
  DiscoBallIcon,
  FocusIcon,
  EcoIcon,
} from "./components/Icons";
import { useJukebox } from "./state/useJukebox";
import { buildAppShellStatusViewModel } from "./state/appShellStatus";
import { useLocalAudioPlayback } from "./state/useLocalAudioPlayback";
import { useSpotifyWebPlayback } from "./state/useSpotifyWebPlayback";
import { nextMode, normalizeModeLabel } from "./state/modeState";

const DEFAULT_DSP_PROFILE: DspProfileKey = "Vocal Clarity";
const INITIAL_DSP_VALUES = DSP_PRESETS[DEFAULT_DSP_PROFILE];

export default function App() {
  const { state, status, error, sendCommand } = useJukebox();
  const { audioRef } = useLocalAudioPlayback({
    media: state.media,
    sendCommand,
  });
  useSpotifyWebPlayback({
    spotify: state.spotify,
    sendCommand,
  });
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const signalBayRef = useRef<HTMLElement | null>(null);
  const [activeTab, setActiveTab] = useState<"mixer" | "effects">("mixer");
  const [songInfoView, setSongInfoView] = useState<"credits" | "audio">(
    "credits",
  );
  const [surfaceView, setSurfaceView] = useState<"jukebox" | "spotify">("jukebox");

  const [bass, setBass] = useState(50);
  const [treble, setTreble] = useState(50);

  const [reverb, setReverb] = useState<number>(INITIAL_DSP_VALUES.reverb);
  const [echo, setEcho] = useState<number>(INITIAL_DSP_VALUES.echo);
  const [delay, setDelay] = useState<number>(INITIAL_DSP_VALUES.delay);
  const [distortion, setDistortion] = useState<number>(
    INITIAL_DSP_VALUES.distortion,
  );
  const [flanger, setFlanger] = useState<number>(INITIAL_DSP_VALUES.flanger);
  const [chorus, setChorus] = useState<number>(INITIAL_DSP_VALUES.chorus);
  const [spinSpeed, setSpinSpeed] = useState(30);

  const theme = state.theme;
  const isPlaying = state.media.isPlaying;
  const progress = state.media.progressPercent;
  const volume = state.media.volumePercent;
  const activeSongId = state.media.activeTrackId;
  const activeSong = state.media.activeTrack;
  const spotify = state.spotify;
  const activeDspProfile = isDspProfileKey(state.media.audio.dspProfile)
    ? state.media.audio.dspProfile
    : DEFAULT_DSP_PROFILE;
  const appStatus = buildAppShellStatusViewModel(state, status, error);
  const currentMode = normalizeModeLabel(state.telemetry.presence.lastMode);

  const spinDuration = spinSpeed === 0 ? 0 : 12 - (spinSpeed / 100) * 10.8;

  const MODE_CONFIG: Record<"idle" | "focus" | "party" | "eco", { icon: React.ReactNode; label: string }> =
    {
      idle: { icon: <CasualIcon />, label: "Idle" },
      focus: { icon: <FocusIcon />, label: "Focus" },
      party: { icon: <DiscoBallIcon />, label: "Party" },
      eco: { icon: <EcoIcon />, label: "Eco" },
    };

  const cycleMode = useCallback(() => {
    void sendCommand({ type: "set_mode", mode: nextMode(currentMode) });
  }, [currentMode, sendCommand]);

  const togglePlay = useCallback(() => {
    void sendCommand({ type: isPlaying ? "pause" : "play" });
  }, [isPlaying, sendCommand]);

  const toggleSongInfoView = useCallback(() => {
    setSongInfoView((view) => (view === "credits" ? "audio" : "credits"));
  }, []);

  const applyDspProfile = useCallback(
    (profile: DspProfileKey) => {
      const preset = DSP_PRESETS[profile];

      setReverb(preset.reverb);
      setEcho(preset.echo);
      setDelay(preset.delay);
      setDistortion(preset.distortion);
      setFlanger(preset.flanger);
      setChorus(preset.chorus);
      void sendCommand({ type: "set_dsp_profile", profile });
    },
    [sendCommand],
  );

  const prevSong = useCallback(() => {
    void sendCommand({ type: "previous" });
  }, [sendCommand]);

  const nextSong = useCallback(() => {
    void sendCommand({ type: "next" });
  }, [sendCommand]);

  const handleProgressDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      const target = e.currentTarget as HTMLElement;

      const updateProgress = (clientX: number) => {
        const rect = target.getBoundingClientRect();
        const relX = clientX - rect.left;
        const pct = Math.max(0, Math.min(100, (relX / rect.width) * 100));
        void sendCommand({ type: "seek", progressPercent: pct });
      };

      updateProgress(e.clientX);

      const handleMouseMove = (ev: MouseEvent) => updateProgress(ev.clientX);
      const handleMouseUp = () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    },
    [sendCommand],
  );

  const openSignalBay = useCallback(() => {
    const appShell = appShellRef.current;
    const signalBay = signalBayRef.current;

    if (!appShell || !signalBay) {
      return;
    }

    appShell.scrollTo({
      top: signalBay.offsetTop,
      behavior: "smooth",
    });
  }, []);

  const closeSignalBay = useCallback(() => {
    appShellRef.current?.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  const audioStatus = {
    primary: state.media.audio.quality,
    secondary: `${state.media.audio.codec} · ${activeDspProfile}`,
  };

  return (
    <div className="app-shell" data-theme={theme} ref={appShellRef}>
      <audio ref={audioRef} preload="metadata" />
      <section className="hero-screen">
        {surfaceView === "spotify" ? (
          <SpotifyPage
            theme={theme}
            spotify={spotify}
            modeControl={MODE_CONFIG[currentMode]}
            onBack={() => setSurfaceView("jukebox")}
            onOpenTelemetry={openSignalBay}
            onCycleMode={cycleMode}
            onSpotifyAuthorize={() => {
              void sendCommand({ type: "spotify_authorize" });
            }}
            onSpotifyInitialize={() => {
              void sendCommand({ type: "spotify_initialize" });
            }}
            onSpotifyTransfer={() => {
              void sendCommand({ type: "spotify_transfer_playback" });
            }}
            onSpotifyDisconnect={() => {
              void sendCommand({ type: "spotify_disconnect" });
            }}
          />
        ) : (
        <div className="app" data-theme={theme}>
          <div className="controls-panel">
            <h2 className="controls-title">Control panel</h2>

            <div className="tabs">
              <button
                className={`tab ${activeTab === "mixer" ? "active" : ""}`}
                onClick={() => setActiveTab("mixer")}
              >
                <MixerIcon className="tab-icon" /> Mixer
              </button>
              <button
                className={`tab ${activeTab === "effects" ? "active" : ""}`}
                onClick={() => setActiveTab("effects")}
              >
                <SparkleIcon className="tab-icon" /> Effects
              </button>
            </div>

            {activeTab === "mixer" ? (
              <div className="sliders-container">
                <VerticalFader
                  icon={<VolumeIcon />}
                  label="Master"
                  value={volume}
                  onChange={(value) => {
                    void sendCommand({
                      type: "set_volume",
                      volumePercent: value,
                    });
                  }}
                />
                <VerticalFader
                  icon={<BassIcon />}
                  label="Bass"
                  value={bass}
                  onChange={setBass}
                />
                <VerticalFader
                  icon={<TrebleIcon />}
                  label="Treble"
                  value={treble}
                  onChange={setTreble}
                />
              </div>
            ) : (
              <div className="effects-container">
                <HorizontalSlider
                  label="Reverb"
                  value={reverb}
                  onChange={setReverb}
                />
                <HorizontalSlider label="Echo" value={echo} onChange={setEcho} />
                <HorizontalSlider
                  label="Delay"
                  value={delay}
                  onChange={setDelay}
                />
                <HorizontalSlider
                  label="Distortion"
                  value={distortion}
                  onChange={setDistortion}
                />
                <HorizontalSlider
                  label="Flanger"
                  value={flanger}
                  onChange={setFlanger}
                />
                <HorizontalSlider
                  label="Chorus"
                  value={chorus}
                  onChange={setChorus}
                />
                <HorizontalSlider
                  label="Spin Speed"
                  value={spinSpeed}
                  onChange={setSpinSpeed}
                />

                <div className="dsp-switch-group">
                  <div className="dsp-switch-header">
                    <span className="dsp-switch-kicker">DSP Profiles</span>
                    <span className="dsp-switch-copy">Quick switches</span>
                  </div>

                  <div className="dsp-switch-list">
                    {(Object.keys(DSP_PRESETS) as DspProfileKey[]).map(
                      (profile) => (
                        <button
                          key={profile}
                          type="button"
                          className={`dsp-switch ${activeDspProfile === profile ? "active" : ""}`}
                          onClick={() => applyDspProfile(profile)}
                        >
                          {profile}
                        </button>
                      ),
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className="controls-footer">
              <button className="btn-signal-bay" onClick={openSignalBay}>
                Open Telemetry Deck
              </button>
            </div>
          </div>

          <div className="center-area">
            {theme === "disco" && <DiscoParticles />}

            <VinylRecord
              coverUrl={activeSong.coverUrl}
              isPlaying={isPlaying}
              spinDuration={spinDuration}
              theme={theme}
            />

            <div className="center-bottom-stack">
              <div className="song-info">
                <div className="song-title">{activeSong.title}</div>

                <button
                  type="button"
                  className="song-detail-surface"
                  onClick={toggleSongInfoView}
                  aria-label="Toggle song details"
                >
                  {songInfoView === "credits" ? (
                    <>
                      <span className="song-artist">{activeSong.artist}</span>
                      <span className="song-album">{activeSong.album}</span>
                    </>
                  ) : (
                    <>
                      <span className="song-audio-primary">
                        {audioStatus.primary}
                      </span>
                      <span className="song-audio-secondary">
                        {audioStatus.secondary}
                      </span>
                    </>
                  )}
                </button>

                <div className="song-detail-dots" aria-label="Song detail tabs">
                  <button
                    type="button"
                    className={`song-detail-dot ${songInfoView === "credits" ? "active" : ""}`}
                    onClick={() => setSongInfoView("credits")}
                    aria-label="Show artist and album"
                  />
                  <button
                    type="button"
                    className={`song-detail-dot ${songInfoView === "audio" ? "active" : ""}`}
                    onClick={() => setSongInfoView("audio")}
                    aria-label="Show audio status"
                  />
                </div>
              </div>

              <div className="progress-bar-wrapper">
                <div
                  className="progress-track"
                  onMouseDown={handleProgressDown}
                >
                  <div
                    className="progress-fill"
                    style={{ width: `${progress}%` }}
                  />
                  <div
                    className="progress-thumb"
                    style={{ left: `${progress}%` }}
                  />
                </div>
              </div>

              <div className="playback-controls">
                <button className="btn-control" onClick={prevSong}>
                  <PrevIcon />
                </button>
                <button className="btn-control btn-play" onClick={togglePlay}>
                  {isPlaying ? <PauseIcon /> : <PlayIcon />}
                </button>
                <button className="btn-control" onClick={nextSong}>
                  <NextIcon />
                </button>
              </div>
            </div>
          </div>

          <MusicPanel
            theme={theme}
            modeControl={MODE_CONFIG[currentMode]}
            songs={state.library.songs}
            playlists={state.library.playlists}
            activeSongId={activeSongId}
            appStatus={appStatus}
            onCycleMode={cycleMode}
            onOpenSpotifyPage={() => setSurfaceView("spotify")}
            onSelectTrack={(trackId) => {
              void sendCommand({
                type: "play_track",
                trackId,
              });
            }}
            onPlayPlaylist={(playlistId, trackId) => {
              void (async () => {
                await sendCommand({
                  type: "play_playlist",
                  playlistId,
                });

                if (typeof trackId === "number") {
                  await sendCommand({
                    type: "play_track",
                    trackId,
                  });
                }
              })();
            }}
          />
        </div>
        )}
      </section>

      <section className="signal-bay-screen" ref={signalBayRef}>
        <SignalBay
          onClose={closeSignalBay}
          telemetry={state.telemetry}
          media={state.media}
          activeDspProfile={activeDspProfile}
          appStatus={appStatus}
        />
      </section>
    </div>
  );
}
