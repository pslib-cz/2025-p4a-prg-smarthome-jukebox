import { useEffect, useState, type FormEvent } from "react";
import {
  fetchSpotifyPlaylistItems,
  fetchSpotifyPlaylists,
  searchSpotifyTracks,
  startSpotifyPlayback,
} from "../state/backendHttpTransport";
import type { SpotifyState } from "../state/jukeboxTypes";
import type {
  SpotifyCatalogPlaylistPayload,
  SpotifyCatalogTrackPayload,
  SpotifyCatalogTrackPagePayload,
} from "../state/remoteContracts";
import { PlayIcon } from "./Icons";
import "./MusicPanelSpotify.css";

const FALLBACK_SPOTIFY_COVER = "/covers/midnight-groove.png";

function formatDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getTrackCover(track: SpotifyCatalogTrackPayload) {
  return track.coverUrl ?? FALLBACK_SPOTIFY_COVER;
}

function getPlaybackReadinessCopy(
  spotify: SpotifyState,
  canTargetBrowserPlayer: boolean,
) {
  if (spotify.authStatus !== "connected") {
    return "Connect Spotify first.";
  }

  if (spotify.accountTier !== "premium") {
    return "Premium is required for browser playback.";
  }

  if (!canTargetBrowserPlayer) {
    return "Initialize the browser player before starting playback.";
  }

  return spotify.isActiveDevice
    ? "Track clicks target this browser player."
    : "Track clicks will target the registered browser device.";
}

function SpotifyEmptyBrowseState({
  title,
  copy,
}: {
  title: string;
  copy: string;
}) {
  return (
    <div className="spotify-browse-empty" role="status">
      <strong>{title}</strong>
      <p>{copy}</p>
    </div>
  );
}

interface MusicPanelSpotifyBrowseProps {
  spotify: SpotifyState;
}

export default function MusicPanelSpotifyBrowse({
  spotify,
}: MusicPanelSpotifyBrowseProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SpotifyCatalogTrackPagePayload | null>(
    null,
  );
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [playlists, setPlaylists] = useState<SpotifyCatalogPlaylistPayload[]>([]);
  const [playlistsError, setPlaylistsError] = useState<string | null>(null);
  const [playlistsLoading, setPlaylistsLoading] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] =
    useState<SpotifyCatalogPlaylistPayload | null>(null);
  const [playlistItems, setPlaylistItems] =
    useState<SpotifyCatalogTrackPagePayload | null>(null);
  const [playlistItemsError, setPlaylistItemsError] = useState<string | null>(null);
  const [playlistItemsLoading, setPlaylistItemsLoading] = useState(false);
  const [playbackFeedback, setPlaybackFeedback] = useState<string | null>(null);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [playbackLoadingUri, setPlaybackLoadingUri] = useState<string | null>(null);

  const canTargetBrowserPlayer =
    spotify.authStatus === "connected" &&
    spotify.accountTier === "premium" &&
    spotify.sdkStatus === "ready" &&
    Boolean(spotify.deviceId);

  useEffect(() => {
    if (spotify.authStatus === "connected" && playlists.length === 0 && !playlistsLoading && !playlistsError) {
      void loadPlaylists();
      return;
    }

    if (spotify.authStatus === "connected") {
      return;
    }

    setPlaylists([]);
    setSelectedPlaylist(null);
    setPlaylistItems(null);
    setSearchResults(null);
    setSearchError(null);
    setPlaylistsError(null);
    setPlaylistItemsError(null);
    setPlaybackFeedback(null);
    setPlaybackError(null);
  }, [playlists.length, playlistsError, playlistsLoading, spotify.authStatus]);

  async function loadPlaylists() {
    setPlaylistsLoading(true);
    setPlaylistsError(null);

    try {
      const page = await fetchSpotifyPlaylists(8, 0);
      setPlaylists(page.items);

      if (selectedPlaylist && !page.items.some((item) => item.id === selectedPlaylist.id)) {
        setSelectedPlaylist(null);
        setPlaylistItems(null);
      }
    } catch (error) {
      setPlaylistsError(error instanceof Error ? error.message : String(error));
    } finally {
      setPlaylistsLoading(false);
    }
  }

  async function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = searchQuery.trim();

    if (!query) {
      setSearchError("Enter a track or artist name first.");
      setSearchResults(null);
      return;
    }

    setSearchLoading(true);
    setSearchError(null);

    try {
      const page = await searchSpotifyTracks(query, 8, 0);
      setSearchResults(page);
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : String(error));
      setSearchResults(null);
    } finally {
      setSearchLoading(false);
    }
  }

  async function handleSelectPlaylist(playlist: SpotifyCatalogPlaylistPayload) {
    setSelectedPlaylist(playlist);
    setPlaylistItemsLoading(true);
    setPlaylistItemsError(null);
    setPlaybackFeedback(null);

    try {
      const page = await fetchSpotifyPlaylistItems(playlist.id, 20, 0);
      setPlaylistItems(page);
    } catch (error) {
      setPlaylistItemsError(error instanceof Error ? error.message : String(error));
      setPlaylistItems(null);
    } finally {
      setPlaylistItemsLoading(false);
    }
  }

  async function handlePlayTrack(
    track: SpotifyCatalogTrackPayload,
    playlist?: SpotifyCatalogPlaylistPayload | null,
  ) {
    if (!canTargetBrowserPlayer || !spotify.deviceId) {
      return;
    }

    setPlaybackLoadingUri(track.uri);
    setPlaybackError(null);
    setPlaybackFeedback(null);

    try {
      await startSpotifyPlayback(
        playlist
          ? {
              deviceId: spotify.deviceId,
              contextUri: playlist.uri,
              offset: { uri: track.uri },
            }
          : {
              deviceId: spotify.deviceId,
              uris: [track.uri],
            },
      );
      setPlaybackFeedback(`Playing ${track.title} on the browser player.`);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : String(error));
    } finally {
      setPlaybackLoadingUri(null);
    }
  }

  async function handlePlayPlaylist(playlist: SpotifyCatalogPlaylistPayload) {
    if (!canTargetBrowserPlayer || !spotify.deviceId) {
      return;
    }

    setPlaybackLoadingUri(playlist.uri);
    setPlaybackError(null);
    setPlaybackFeedback(null);

    try {
      await startSpotifyPlayback({
        deviceId: spotify.deviceId,
        contextUri: playlist.uri,
      });
      setPlaybackFeedback(`Playing playlist ${playlist.name} on the browser player.`);
    } catch (error) {
      setPlaybackError(error instanceof Error ? error.message : String(error));
    } finally {
      setPlaybackLoadingUri(null);
    }
  }

  if (!spotify.configured) {
    return (
      <SpotifyEmptyBrowseState
        title="Spotify backend is not configured"
        copy="Add Spotify client credentials and redirect URIs first. Catalog browsing stays disabled until the backend is ready."
      />
    );
  }

  if (spotify.authStatus !== "connected") {
    return (
      <SpotifyEmptyBrowseState
        title="Connect Spotify first"
        copy="Search, playlists, and browser playback become available after the PKCE session is connected."
      />
    );
  }

  return (
    <div className="spotify-browse-panel">
      <div className="spotify-browse-callout">
        <div className="spotify-browse-callout-copy">
          <span className="spotify-browse-kicker">Browser catalog</span>
          <strong>Search Spotify tracks and load your playlists</strong>
          <p>{getPlaybackReadinessCopy(spotify, canTargetBrowserPlayer)}</p>
        </div>
        <span
          className={`spotify-browse-pill ${canTargetBrowserPlayer ? "ready" : "pending"}`}
        >
          {canTargetBrowserPlayer ? "Playback ready" : "Playback not ready"}
        </span>
      </div>

      {playbackError ? <div className="spotify-browse-alert error">{playbackError}</div> : null}
      {playbackFeedback ? (
        <div className="spotify-browse-alert success">{playbackFeedback}</div>
      ) : null}

      <form className="spotify-search-form" onSubmit={handleSearchSubmit}>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="spotify-search-input"
          placeholder="Search track or artist"
        />
        <button
          type="submit"
          className="spotify-search-button"
          disabled={searchLoading}
        >
          {searchLoading ? "Searching..." : "Search"}
        </button>
      </form>

      {searchError ? <div className="spotify-browse-alert error">{searchError}</div> : null}

      {searchResults ? (
        <section className="spotify-browse-section">
          <div className="spotify-browse-section-head">
            <div>
              <span className="spotify-browse-kicker">Spotify search</span>
              <strong>Top matches</strong>
            </div>
            <span>{searchResults.total} available</span>
          </div>

          {searchResults.items.length > 0 ? (
            <div className="spotify-track-list">
              {searchResults.items.map((track) => (
                <article key={track.uri} className="spotify-track-row">
                  <img
                    src={getTrackCover(track)}
                    alt={track.title}
                    className="spotify-track-row-cover"
                  />
                  <div className="spotify-track-row-copy">
                    <strong>{track.title}</strong>
                    <span>{track.artist}</span>
                    <small>{track.album}</small>
                  </div>
                  <span className="spotify-track-row-duration">
                    {formatDuration(track.durationMs)}
                  </span>
                  <a
                    href={track.externalUrl ?? "#"}
                    target="_blank"
                    rel="noreferrer"
                    className={`spotify-link-chip ${track.externalUrl ? "" : "disabled"}`}
                  >
                    Spotify
                  </a>
                  <button
                    type="button"
                    className="spotify-inline-play"
                    onClick={() => void handlePlayTrack(track)}
                    disabled={!canTargetBrowserPlayer || playbackLoadingUri === track.uri}
                  >
                    <PlayIcon size={14} />
                    {playbackLoadingUri === track.uri ? "Starting..." : "Play"}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <SpotifyEmptyBrowseState
              title="No matching tracks"
              copy="Search returned no playable track results for the current account."
            />
          )}
        </section>
      ) : null}

      <div className="spotify-browse-grid">
        <section className="spotify-browse-section">
          <div className="spotify-browse-section-head">
            <div>
              <span className="spotify-browse-kicker">My Playlists</span>
              <strong>Personal playlists</strong>
            </div>
            <button
              type="button"
              className="spotify-link-button"
              onClick={() => void loadPlaylists()}
              disabled={playlistsLoading}
            >
              {playlistsLoading ? "Refreshing..." : "Refresh"}
            </button>
          </div>

          {playlistsError ? (
            <div className="spotify-browse-alert error">{playlistsError}</div>
          ) : null}

          {playlists.length > 0 ? (
            <div className="spotify-playlist-list">
              {playlists.map((playlist) => (
                <button
                  key={playlist.id}
                  type="button"
                  className={`spotify-playlist-card ${selectedPlaylist?.id === playlist.id ? "selected" : ""}`}
                  onClick={() => void handleSelectPlaylist(playlist)}
                >
                  <img
                    src={playlist.imageUrl ?? FALLBACK_SPOTIFY_COVER}
                    alt={playlist.name}
                    className="spotify-playlist-card-cover"
                  />
                  <div className="spotify-playlist-card-copy">
                    <strong>{playlist.name}</strong>
                    <span>{playlist.ownerName ?? "Spotify user"}</span>
                    <small>{playlist.trackCount} tracks</small>
                  </div>
                </button>
              ))}
            </div>
          ) : playlistsLoading ? (
            <SpotifyEmptyBrowseState
              title="Loading playlists"
              copy="Reading the authenticated user's playlists from Spotify."
            />
          ) : (
            <SpotifyEmptyBrowseState
              title="No playlists available"
              copy="This account does not expose private playlists yet, or the new scope still needs a fresh reconnect."
            />
          )}
        </section>

        <section className="spotify-browse-section">
          <div className="spotify-browse-section-head">
            <div>
              <span className="spotify-browse-kicker">Playlist Detail</span>
              <strong>{selectedPlaylist?.name ?? "Select a playlist"}</strong>
            </div>
            {selectedPlaylist ? (
              <button
                type="button"
                className="spotify-link-button"
                onClick={() => void handlePlayPlaylist(selectedPlaylist)}
                disabled={!canTargetBrowserPlayer || playbackLoadingUri === selectedPlaylist.uri}
              >
                {playbackLoadingUri === selectedPlaylist.uri ? "Starting..." : "Play playlist"}
              </button>
            ) : null}
          </div>

          {selectedPlaylist ? (
            <>
              <div className="spotify-playlist-detail-meta">
                <span>{selectedPlaylist.description ?? "No description"}</span>
                {selectedPlaylist.externalUrl ? (
                  <a
                    href={selectedPlaylist.externalUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="spotify-link-chip"
                  >
                    Open in Spotify
                  </a>
                ) : null}
              </div>

              {playlistItemsError ? (
                <div className="spotify-browse-alert error">{playlistItemsError}</div>
              ) : null}

              {playlistItemsLoading ? (
                <SpotifyEmptyBrowseState
                  title="Loading playlist tracks"
                  copy="Reading track items from Spotify."
                />
              ) : playlistItems?.items.length ? (
                <div className="spotify-track-list">
                  {playlistItems.items.map((track) => (
                    <article key={`${selectedPlaylist.id}-${track.uri}`} className="spotify-track-row">
                      <img
                        src={getTrackCover(track)}
                        alt={track.title}
                        className="spotify-track-row-cover"
                      />
                      <div className="spotify-track-row-copy">
                        <strong>{track.title}</strong>
                        <span>{track.artist}</span>
                        <small>{track.album}</small>
                      </div>
                      <span className="spotify-track-row-duration">
                        {formatDuration(track.durationMs)}
                      </span>
                      <button
                        type="button"
                        className="spotify-inline-play"
                        onClick={() => void handlePlayTrack(track, selectedPlaylist)}
                        disabled={!canTargetBrowserPlayer || playbackLoadingUri === track.uri}
                      >
                        <PlayIcon size={14} />
                        {playbackLoadingUri === track.uri ? "Starting..." : "Play"}
                      </button>
                    </article>
                  ))}
                </div>
              ) : (
                <SpotifyEmptyBrowseState
                  title="No playable playlist items"
                  copy="This playlist does not expose playable track items through the current Spotify session."
                />
              )}
            </>
          ) : (
            <SpotifyEmptyBrowseState
              title="No playlist selected"
              copy="Open a playlist on the left to inspect tracks and start playback from playlist context."
            />
          )}
        </section>
      </div>
    </div>
  );
}
