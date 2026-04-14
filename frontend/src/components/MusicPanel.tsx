import { useMemo, useState, type ReactNode } from "react";
import type {
  JukeboxPlaylist,
  JukeboxTheme,
  JukeboxTrack,
  SpotifyState,
} from "../state/jukeboxTypes";
import type {
  AppShellStatusViewModel,
  DataAvailabilityState,
} from "../state/appShellStatus";
import PlaylistItem from "./PlaylistItem";
import { ListIcon, MusicNoteIcon, SongsIcon } from "./Icons";
import {
  buildSpotifyPanelViewModel,
  getSpotifyTrackProgress,
} from "./spotifyPanelViewModel";
import "./MusicPanel.css";

type LocalTab = "playlist" | "songs";
type PanelSourceView = "local" | "spotify";
type SpotifyDetailView = "player" | "tech";

interface MusicPanelProps {
  theme: JukeboxTheme;
  themeControl: {
    icon: ReactNode;
    label: string;
  };
  songs: JukeboxTrack[];
  playlists: JukeboxPlaylist[];
  activeSongId: number;
  spotify: SpotifyState;
  appStatus: AppShellStatusViewModel;
  onToggleTheme: () => void;
  onSelectTrack: (trackId: number) => void;
  onSpotifyAuthorize: () => void;
  onSpotifyInitialize: () => void;
  onSpotifyTransfer: () => void;
  onSpotifyDisconnect: () => void;
}

function LocalPanelEmptyState({
  kicker,
  title,
  copy,
}: {
  kicker: string;
  title: string;
  copy: string;
}) {
  return (
    <div className="music-panel-empty" role="status">
      <span className="music-panel-empty-kicker">{kicker}</span>
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

function getCollectionEmptyCopy(
  collectionState: DataAvailabilityState,
  collectionLabel: "songs" | "playlists",
) {
  switch (collectionState) {
    case "loading":
      return {
        kicker: "Syncing",
        title: `Loading ${collectionLabel}`,
        copy: "Waiting for the first payload from the shared app-state provider.",
      };
    case "offline":
      return {
        kicker: "Offline",
        title: `${collectionLabel} are unavailable`,
        copy:
          "The connection dropped before this section received data. It will hydrate automatically after reconnect.",
      };
    case "error":
      return {
        kicker: "Error",
        title: `Could not read ${collectionLabel}`,
        copy:
          "The provider failed before this list could synchronize. Keep the layout and retry the adapter.",
      };
    default:
      return {
        kicker: "Empty",
        title: `No ${collectionLabel} yet`,
        copy:
          collectionLabel === "songs"
            ? "This slot is ready for the required local MP3 source. The library will appear here after the first sync."
            : "Playlists are optional at this stage. Create or import them after the local library is wired.",
      };
  }
}

function SpotifyLogoMark() {
  return (
    <svg
      className="spotify-logo"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

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

export default function MusicPanel({
  theme,
  themeControl,
  songs,
  playlists,
  activeSongId,
  spotify,
  appStatus,
  onToggleTheme,
  onSelectTrack,
  onSpotifyAuthorize,
  onSpotifyInitialize,
  onSpotifyTransfer,
  onSpotifyDisconnect,
}: MusicPanelProps) {
  const [rightTab, setRightTab] = useState<LocalTab>("songs");
  const [panelSourceView, setPanelSourceView] = useState<PanelSourceView>("local");
  const [spotifyDetailView, setSpotifyDetailView] =
    useState<SpotifyDetailView>("player");

  const spotifyViewModel = useMemo(
    () => buildSpotifyPanelViewModel(spotify),
    [spotify],
  );
  const songsEmptyCopy = getCollectionEmptyCopy(appStatus.libraryState, "songs");
  const playlistsEmptyCopy = getCollectionEmptyCopy(
    appStatus.playlistState,
    "playlists",
  );

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
    <div className="playlist-panel" data-theme={theme}>
      <div className="playlist-header">
        <div className="playlist-title-group">
          {panelSourceView === "local" ? (
            <MusicNoteIcon className="playlist-icon" />
          ) : (
            <span className="playlist-icon">
              <SpotifyLogoMark />
            </span>
          )}
          <div className="music-panel-title-block">
            <h2 className="playlist-title">
              {panelSourceView === "local" ? "Local Music" : "Spotify"}
            </h2>
            <span className="music-panel-subtitle">
              {panelSourceView === "local"
                ? "Owned library and playlists"
                : "Web Playback SDK"}
            </span>
          </div>
        </div>

        <button className="mode-toggle" onClick={onToggleTheme}>
          <span className="mode-icon">{themeControl.icon}</span>
          {themeControl.label}
        </button>
      </div>

      {panelSourceView === "local" ? (
        <>
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
            songs.length > 0 ? (
              <div className="playlist-list">
                {songs.map((song) => (
                  <PlaylistItem
                    key={song.id}
                    title={song.title}
                    artist={song.artist}
                    duration={song.duration}
                    coverUrl={song.coverUrl}
                    isActive={song.id === activeSongId}
                    onClick={() => onSelectTrack(song.id)}
                  />
                ))}
              </div>
            ) : (
              <LocalPanelEmptyState
                kicker={songsEmptyCopy.kicker}
                title={songsEmptyCopy.title}
                copy={songsEmptyCopy.copy}
              />
            )
          ) : (
            <div className="playlists-view">
              <button className="btn-create-playlist">
                <span className="btn-create-icon">+</span>
                Create Playlist
              </button>
              {playlists.length > 0 ? (
                <div className="playlist-list">
                  {playlists.map((playlist) => (
                    <div key={playlist.id} className="playlist-card">
                      <span className="playlist-card-icon">{playlist.icon}</span>
                      <div className="playlist-card-info">
                        <div className="playlist-card-name">{playlist.name}</div>
                        <div className="playlist-card-count">
                          {playlist.songCount} songs
                        </div>
                      </div>
                      <span className="playlist-card-arrow">›</span>
                    </div>
                  ))}
                </div>
              ) : (
                <LocalPanelEmptyState
                  kicker={playlistsEmptyCopy.kicker}
                  title={playlistsEmptyCopy.title}
                  copy={playlistsEmptyCopy.copy}
                />
              )}
            </div>
          )}
        </>
      ) : (
        <div className="spotify-sketch-panel">
          <div className="spotify-surface">
            <div className="spotify-status-hero">
              <div className="spotify-status-copy">
                <span className="spotify-kicker">Browser player</span>
                <strong>{spotifyViewModel.statusLabel}</strong>
                <p>{spotifyViewModel.statusCopy}</p>
              </div>

              <div className="spotify-badge-stack">
                <span className="spotify-tier-badge">
                  {spotify.accountTier === "premium"
                    ? "Premium"
                    : spotify.accountTier}
                </span>
                <span
                  className={`spotify-status-badge ${getSpotifyTone(spotifyViewModel.statusLabel)}`}
                >
                  {spotify.sdkStatus.replace("_", " ")}
                </span>
              </div>
            </div>

            <div className="spotify-stage-strip">
              <button
                type="button"
                className={`spotify-view-button ${spotifyDetailView === "player" ? "active" : ""}`}
                onClick={() => setSpotifyDetailView("player")}
              >
                Player
              </button>
              <button
                type="button"
                className={`spotify-view-button ${spotifyDetailView === "tech" ? "active" : ""}`}
                onClick={() => setSpotifyDetailView("tech")}
              >
                Tech
              </button>
            </div>

            {spotifyDetailView === "player" ? (
              <div className="spotify-overview">
                {spotify.currentTrack ? (
                  <div className="spotify-track-card">
                    <img
                      src={spotify.currentTrack.coverUrl}
                      alt={spotify.currentTrack.title}
                      className="spotify-track-cover"
                    />
                    <div className="spotify-track-copy">
                      <span className="spotify-track-kicker">
                        Spotify playback
                      </span>
                      <strong>{spotify.currentTrack.title}</strong>
                      <span>
                        {spotify.currentTrack.artist} · {spotify.currentTrack.album}
                      </span>
                      <span className="spotify-track-progress">
                        {getSpotifyTrackProgress(spotify)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="spotify-line-list">
                  <div className="spotify-line-row">
                    <span>Browser device</span>
                    <strong>{spotify.deviceName}</strong>
                  </div>
                  <div className="spotify-line-row">
                    <span>Playback target</span>
                    <strong>
                      {spotify.isActiveDevice ? "This browser" : "Another device"}
                    </strong>
                  </div>
                  <div className="spotify-line-row">
                    <span>Status</span>
                    <strong>
                      {spotify.transferStatus === "active"
                        ? "Transfer completed"
                        : "Waiting for playback transfer"}
                    </strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="spotify-setup-panel">
                <div className="spotify-tech-list">
                  {spotifyViewModel.timeline.map((step) => (
                    <div key={step.label} className="spotify-tech-row">
                      <span>{step.label}</span>
                      <strong>{step.value}</strong>
                    </div>
                  ))}
                  <div className="spotify-tech-row">
                    <span>Device id</span>
                    <strong>{spotify.deviceId ?? "Will appear after SDK ready"}</strong>
                  </div>
                </div>
                <div className="spotify-scope-list">
                  {spotify.scopes.map((scope) => (
                    <span key={scope} className="spotify-scope-chip">
                      {scope}
                    </span>
                  ))}
                </div>
                <p className="spotify-footnote">
                  Web Playback SDK needs a live browser session, Premium
                  account, PKCE auth flow, and Spotify Connect playback
                  transfer.
                </p>
              </div>
            )}
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
      )}

      <div className="spotify-section">
        <button
          className={`btn-spotify ${panelSourceView === "spotify" ? "connected" : ""}`}
          onClick={() =>
            setPanelSourceView((view) => (view === "local" ? "spotify" : "local"))
          }
        >
          <SpotifyLogoMark />
          {panelSourceView === "local" ? "Switch to Spotify" : "Back to Local Music"}
        </button>
      </div>
    </div>
  );
}
