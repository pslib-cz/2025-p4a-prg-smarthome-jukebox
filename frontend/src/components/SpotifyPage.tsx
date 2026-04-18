import type { ReactNode } from "react";
import type { JukeboxTheme, SpotifyState } from "../state/jukeboxTypes";
import MusicPanelSpotifyBrowse from "./MusicPanelSpotifyBrowse";
import SpotifyLogoMark from "./SpotifyLogoMark";
import {
  buildSpotifyPanelViewModel,
  getSpotifyTrackProgress,
} from "./spotifyPanelViewModel";
import "./SpotifyPage.css";

function getSpotifyTone(statusLabel: string) {
  switch (statusLabel) {
    case "Active Device":
      return "is-good";
    case "SDK Ready":
      return "is-accent";
    case "Connected":
      return "is-soft";
    default:
      return "";
  }
}

function getTrackCover(track: SpotifyState["currentTrack"]) {
  return track?.coverUrl ?? "/covers/midnight-groove.png";
}

interface SpotifyPageProps {
  theme: JukeboxTheme;
  spotify: SpotifyState;
  modeControl: {
    icon: ReactNode;
    label: string;
  };
  onBack: () => void;
  onOpenTelemetry: () => void;
  onCycleMode: () => void;
  onSpotifyAuthorize: () => void;
  onSpotifyInitialize: () => void;
  onSpotifyTransfer: () => void;
  onSpotifyDisconnect: () => void;
}

export default function SpotifyPage({
  theme,
  spotify,
  modeControl,
  onBack,
  onOpenTelemetry,
  onCycleMode,
  onSpotifyAuthorize,
  onSpotifyInitialize,
  onSpotifyTransfer,
  onSpotifyDisconnect,
}: SpotifyPageProps) {
  const spotifyViewModel = buildSpotifyPanelViewModel(spotify);

  function handlePrimarySpotifyAction() {
    switch (spotifyViewModel.primaryActionKind) {
      case "authorize":
        onSpotifyAuthorize();
        break;
      case "initialize":
        onSpotifyInitialize();
        break;
      case "transfer":
        onSpotifyTransfer();
        break;
      default:
        break;
    }
  }

  return (
    <section className="spotify-page-shell" data-theme={theme}>
      <header className="spotify-page-header">
        <div className="spotify-page-title-group">
          <span className="spotify-page-mark">
            <SpotifyLogoMark />
          </span>
          <div className="spotify-page-title-copy">
            <span className="spotify-page-kicker">Spotify Workspace</span>
            <h1>Search, playlists and browser playback</h1>
            <p>
              Connect Spotify, initialize the browser device, then play tracks
              directly from search or your playlists.
            </p>
          </div>
        </div>

        <div className="spotify-page-header-actions">
          <button type="button" className="spotify-page-header-button" onClick={onBack}>
            Back to jukebox
          </button>
          <button
            type="button"
            className="spotify-page-header-button"
            onClick={onOpenTelemetry}
          >
            Open telemetry
          </button>
          <button
            type="button"
            className="spotify-page-header-button mode"
            onClick={onCycleMode}
          >
            <span className="mode-icon">{modeControl.icon}</span>
            {modeControl.label}
          </button>
        </div>
      </header>

      <div className="spotify-page-grid">
        <aside className="spotify-page-sidebar">
          <div className="spotify-surface spotify-page-status-card">
            <div className="spotify-status-hero">
              <div className="spotify-status-copy">
                <span className="spotify-kicker">Browser player</span>
                <strong>{spotifyViewModel.statusLabel}</strong>
                <p>{spotifyViewModel.statusCopy}</p>
              </div>

              <div className="spotify-badge-stack">
                <span className="spotify-tier-badge">
                  {spotify.accountTier === "premium" ? "Premium" : spotify.accountTier}
                </span>
                <span
                  className={`spotify-status-badge ${getSpotifyTone(spotifyViewModel.statusLabel)}`}
                >
                  {spotify.sdkStatus.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="spotify-action-row">
              <button
                type="button"
                className={`spotify-action-button ${spotifyViewModel.primaryActionKind === "active" ? "is-static" : ""}`}
                onClick={handlePrimarySpotifyAction}
                disabled={
                  spotifyViewModel.primaryActionKind === "active" ||
                  spotifyViewModel.primaryActionKind === "disabled"
                }
              >
                {spotifyViewModel.primaryActionLabel}
              </button>

              {spotifyViewModel.secondaryActionLabel ? (
                <button
                  type="button"
                  className="spotify-action-button secondary"
                  onClick={onSpotifyDisconnect}
                >
                  {spotifyViewModel.secondaryActionLabel}
                </button>
              ) : null}
            </div>
          </div>

          <div className="spotify-surface spotify-page-track-card">
            <span className="spotify-kicker">Current track</span>
            {spotify.currentTrack ? (
              <div className="spotify-track-card">
                <img
                  src={getTrackCover(spotify.currentTrack)}
                  alt={spotify.currentTrack.title}
                  className="spotify-track-cover"
                />
                <div className="spotify-track-copy">
                  <strong>{spotify.currentTrack.title}</strong>
                  <span>
                    {spotify.currentTrack.artist} · {spotify.currentTrack.album}
                  </span>
                  <span className="spotify-track-progress">
                    {getSpotifyTrackProgress(spotify)}
                  </span>
                </div>
              </div>
            ) : (
              <div className="spotify-page-empty-copy">
                No active Spotify track yet.
              </div>
            )}

            <div className="spotify-line-list">
              <div className="spotify-line-row">
                <span>Browser device</span>
                <strong>{spotify.deviceName}</strong>
              </div>
              <div className="spotify-line-row">
                <span>Playback target</span>
                <strong>{spotify.isActiveDevice ? "This browser" : "Another device"}</strong>
              </div>
              <div className="spotify-line-row">
                <span>Device id</span>
                <strong>{spotify.deviceId ?? "Waiting for SDK"}</strong>
              </div>
            </div>
          </div>

          <div className="spotify-surface spotify-page-tech-card">
            <span className="spotify-kicker">Checklist</span>
            <div className="spotify-tech-list">
              {spotifyViewModel.timeline.map((step) => (
                <div key={step.label} className="spotify-tech-row">
                  <span>{step.label}</span>
                  <strong>{step.value}</strong>
                </div>
              ))}
            </div>
            <div className="spotify-scope-list">
              {spotify.scopes.map((scope) => (
                <span key={scope} className="spotify-scope-chip">
                  {scope}
                </span>
              ))}
            </div>
          </div>
        </aside>

        <main className="spotify-page-main">
          <MusicPanelSpotifyBrowse spotify={spotify} />
        </main>
      </div>
    </section>
  );
}
