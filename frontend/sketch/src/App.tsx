import { useState, useCallback, useRef } from "react";
import "./App.css";
import "./AppShell.css";
import "./components/HeroStage.css";
import VerticalFader from "./components/VerticalFader";
import HorizontalSlider from "./components/HorizontalSlider";
import VinylRecord from "./components/VinylRecord";
import PlaylistItem from "./components/PlaylistItem";
import DiscoParticles from "./components/DiscoParticles";
import SignalBay from "./components/SignalBay";
import {
  AUDIO_STATUS_BASE,
  DSP_PRESETS,
  PLAYLISTS,
  SONGS,
  type DspProfileKey,
} from "./appSketchData";
import {
  VolumeIcon,
  BassIcon,
  TrebleIcon,
  MusicNoteIcon,
  MixerIcon,
  SparkleIcon,
  PlayIcon,
  PauseIcon,
  PrevIcon,
  NextIcon,
  SongsIcon,
  ListIcon,
  CasualIcon,
  DiscoBallIcon,
  FocusIcon,
  EcoIcon,
} from "./components/Icons";

const THEMES = ["casual", "disco", "focus", "eco"] as const;
type Theme = (typeof THEMES)[number];

export default function App() {
  const appShellRef = useRef<HTMLDivElement | null>(null);
  const signalBayRef = useRef<HTMLElement | null>(null);
  const [theme, setTheme] = useState<Theme>("casual");
  const [activeTab, setActiveTab] = useState<"mixer" | "effects">("mixer");
  const [rightTab, setRightTab] = useState<"playlist" | "songs">("songs");
  const [spotifyConnected, setSpotifyConnected] = useState(false);
  const [activeSongId, setActiveSongId] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(35);
  const [songInfoView, setSongInfoView] = useState<"credits" | "audio">(
    "credits",
  );
  const [activeDspProfile, setActiveDspProfile] =
    useState<DspProfileKey>("Vocal Clarity");

  // Mixer faders
  const [volume, setVolume] = useState(75);
  const [bass, setBass] = useState(50);
  const [treble, setTreble] = useState(50);

  // Effects
  const [reverb, setReverb] = useState(30);
  const [echo, setEcho] = useState(15);
  const [delay, setDelay] = useState(20);
  const [distortion, setDistortion] = useState(0);
  const [flanger, setFlanger] = useState(10);
  const [chorus, setChorus] = useState(25);
  const [spinSpeed, setSpinSpeed] = useState(30);

  const spinDuration = spinSpeed === 0 ? 0 : 12 - (spinSpeed / 100) * 10.8;

  const activeSong = SONGS.find((s) => s.id === activeSongId) || SONGS[0];

  const toggleTheme = useCallback(() => {
    setTheme((t) => {
      const idx = THEMES.indexOf(t);
      return THEMES[(idx + 1) % THEMES.length];
    });
  }, []);

  const THEME_CONFIG: Record<Theme, { icon: React.ReactNode; label: string }> =
    {
      casual: { icon: <CasualIcon />, label: "Casual" },
      disco: { icon: <DiscoBallIcon />, label: "Disco" },
      focus: { icon: <FocusIcon />, label: "Focus" },
      eco: { icon: <EcoIcon />, label: "Eco" },
    };

  const togglePlay = useCallback(() => {
    setIsPlaying((p) => !p);
  }, []);

  const toggleSongInfoView = useCallback(() => {
    setSongInfoView((view) => (view === "credits" ? "audio" : "credits"));
  }, []);

  const applyDspProfile = useCallback((profile: DspProfileKey) => {
    const preset = DSP_PRESETS[profile];

    setActiveDspProfile(profile);
    setReverb(preset.reverb);
    setEcho(preset.echo);
    setDelay(preset.delay);
    setDistortion(preset.distortion);
    setFlanger(preset.flanger);
    setChorus(preset.chorus);
  }, []);

  const prevSong = useCallback(() => {
    setActiveSongId((id) => {
      const idx = SONGS.findIndex((s) => s.id === id);
      const prevIdx = idx <= 0 ? SONGS.length - 1 : idx - 1;
      return SONGS[prevIdx].id;
    });
  }, []);

  const nextSong = useCallback(() => {
    setActiveSongId((id) => {
      const idx = SONGS.findIndex((s) => s.id === id);
      const nextIdx = idx >= SONGS.length - 1 ? 0 : idx + 1;
      return SONGS[nextIdx].id;
    });
  }, []);

  const handleProgressDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const target = e.currentTarget as HTMLElement;

    const updateProgress = (clientX: number) => {
      const rect = target.getBoundingClientRect();
      const relX = clientX - rect.left;
      const pct = Math.max(0, Math.min(100, (relX / rect.width) * 100));
      setProgress(Math.round(pct));
    };

    updateProgress(e.clientX);

    const handleMouseMove = (ev: MouseEvent) => updateProgress(ev.clientX);
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  }, []);

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
    primary: AUDIO_STATUS_BASE.primary,
    secondary: `${AUDIO_STATUS_BASE.source} · ${activeDspProfile}`,
  };

  return (
    <div className="app-shell" data-theme={theme} ref={appShellRef}>
      <section className="hero-screen">
        <div className="app" data-theme={theme}>
          {/* LEFT PANEL - DJ CONTROLS */}
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
                  onChange={setVolume}
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
                <HorizontalSlider
                  label="Echo"
                  value={echo}
                  onChange={setEcho}
                />
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
                    {(Object.keys(DSP_PRESETS) as DspProfileKey[]).map((profile) => (
                      <button
                        key={profile}
                        type="button"
                        className={`dsp-switch ${activeDspProfile === profile ? "active" : ""}`}
                        onClick={() => applyDspProfile(profile)}
                      >
                        {profile}
                      </button>
                    ))}
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

          {/* CENTER - VINYL + PLAYER */}
          <div className="center-area">
            {theme === "disco" && <DiscoParticles />}

            <VinylRecord
              coverUrl={activeSong.cover}
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

          {/* RIGHT PANEL - MUSIC LIBRARY */}
          <div className="playlist-panel">
            <div className="playlist-header">
              <div className="playlist-title-group">
                <MusicNoteIcon className="playlist-icon" />
                <h2 className="playlist-title">Music</h2>
              </div>
              <button className="mode-toggle" onClick={toggleTheme}>
                <span className="mode-icon">{THEME_CONFIG[theme].icon}</span>
                {THEME_CONFIG[theme].label}
              </button>
            </div>

            {/* Right panel tabs */}
            <div className="tabs right-tabs">
              <button
                className={`tab ${rightTab === "songs" ? "active" : ""}`}
                onClick={() => setRightTab("songs")}
              >
                <SongsIcon className="tab-icon" /> Songs
              </button>
              <button
                className={`tab ${rightTab === "playlist" ? "active" : ""}`}
                onClick={() => setRightTab("playlist")}
              >
                <ListIcon className="tab-icon" /> Playlists
              </button>
            </div>

            {rightTab === "songs" ? (
              <div className="playlist-list">
                {SONGS.map((song) => (
                  <PlaylistItem
                    key={song.id}
                    title={song.title}
                    artist={song.artist}
                    duration={song.duration}
                    coverUrl={song.cover}
                    isActive={song.id === activeSongId}
                    onClick={() => setActiveSongId(song.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="playlists-view">
                {!spotifyConnected && (
                  <button className="btn-create-playlist">
                    <span className="btn-create-icon">+</span>
                    Create Playlist
                  </button>
                )}
                <div className="playlist-list">
                  {PLAYLISTS.map((pl) => (
                    <div key={pl.id} className="playlist-card">
                      <span className="playlist-card-icon">{pl.icon}</span>
                      <div className="playlist-card-info">
                        <div className="playlist-card-name">{pl.name}</div>
                        <div className="playlist-card-count">
                          {pl.songCount} songs
                        </div>
                      </div>
                      <span className="playlist-card-arrow">›</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Spotify connect button */}
            <div className="spotify-section">
              <button
                className={`btn-spotify ${spotifyConnected ? "connected" : ""}`}
                onClick={() => setSpotifyConnected((c) => !c)}
              >
                <svg
                  className="spotify-logo"
                  viewBox="0 0 24 24"
                  width="20"
                  height="20"
                  fill="currentColor"
                >
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                {spotifyConnected ? "Spotify Connected" : "Connect Spotify"}
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="signal-bay-screen" ref={signalBayRef}>
        <SignalBay
          onClose={closeSignalBay}
          activeDspProfile={activeDspProfile}
        />
      </section>
    </div>
  );
}
