import { useEffect, useMemo, useState } from "react";
import type {
  AppShellStatusViewModel,
  DataAvailabilityState,
} from "../state/appShellStatus";
import type { JukeboxPlaylist, JukeboxTrack } from "../state/jukeboxTypes";
import { ListIcon, PlayIcon, SongsIcon } from "./Icons";
import PlaylistItem from "./PlaylistItem";
import {
  findPlaylistById,
  getPlaylistLeadTrack,
  getPlaylistTracks,
} from "./musicPanelPlaylists";

type LocalTab = "playlist" | "songs";

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
            : "No synced playlists are available yet. They will appear here after the backend scans the library.",
      };
  }
}

function formatSongCount(songCount: number) {
  return `${songCount} ${songCount === 1 ? "song" : "songs"}`;
}

interface MusicPanelLocalLibraryProps {
  songs: JukeboxTrack[];
  playlists: JukeboxPlaylist[];
  activeSongId: number;
  appStatus: AppShellStatusViewModel;
  onSelectTrack: (trackId: number) => void;
  onPlayPlaylist: (playlistId: number, trackId?: number) => void;
}

export default function MusicPanelLocalLibrary({
  songs,
  playlists,
  activeSongId,
  appStatus,
  onSelectTrack,
  onPlayPlaylist,
}: MusicPanelLocalLibraryProps) {
  const [rightTab, setRightTab] = useState<LocalTab>("songs");
  const [selectedPlaylistId, setSelectedPlaylistId] = useState<number | null>(null);

  const songsEmptyCopy = getCollectionEmptyCopy(appStatus.libraryState, "songs");
  const playlistsEmptyCopy = getCollectionEmptyCopy(
    appStatus.playlistState,
    "playlists",
  );
  const selectedPlaylist = useMemo(
    () => findPlaylistById(playlists, selectedPlaylistId),
    [playlists, selectedPlaylistId],
  );
  const selectedPlaylistTracks = useMemo(
    () => (selectedPlaylist ? getPlaylistTracks(selectedPlaylist, songs) : []),
    [selectedPlaylist, songs],
  );
  const playlistLeadTrack = useMemo(
    () =>
      selectedPlaylist ? getPlaylistLeadTrack(selectedPlaylist, songs) : null,
    [selectedPlaylist, songs],
  );

  useEffect(() => {
    if (selectedPlaylistId !== null && !selectedPlaylist) {
      setSelectedPlaylistId(null);
    }
  }, [selectedPlaylist, selectedPlaylistId]);

  return (
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
          {selectedPlaylist ? (
            <>
              <div className="playlist-detail-head">
                <button
                  type="button"
                  className="playlist-detail-button"
                  onClick={() => setSelectedPlaylistId(null)}
                >
                  Back
                </button>
                <div className="playlist-detail-hero">
                  <span className="playlist-card-icon">{selectedPlaylist.icon}</span>
                  <div className="playlist-card-info">
                    <span className="playlist-detail-kicker">Playlist detail</span>
                    <div className="playlist-card-name">{selectedPlaylist.name}</div>
                    <div className="playlist-card-count">
                      {formatSongCount(selectedPlaylistTracks.length)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="playlist-detail-actions">
                <button
                  type="button"
                  className="playlist-detail-button primary"
                  onClick={() =>
                    playlistLeadTrack
                      ? onPlayPlaylist(selectedPlaylist.id, playlistLeadTrack.id)
                      : undefined
                  }
                  disabled={!playlistLeadTrack}
                >
                  <PlayIcon size={14} className="playlist-detail-action-icon" />
                  Play from start
                </button>
                <span className="playlist-detail-meta">
                  {formatSongCount(selectedPlaylist.songCount)}
                </span>
              </div>

              {selectedPlaylistTracks.length > 0 ? (
                <div className="playlist-list">
                  {selectedPlaylistTracks.map((track) => (
                    <PlaylistItem
                      key={`${selectedPlaylist.id}-${track.id}`}
                      title={track.title}
                      artist={track.artist}
                      duration={track.duration}
                      coverUrl={track.coverUrl}
                      isActive={track.id === activeSongId}
                      onClick={() => onPlayPlaylist(selectedPlaylist.id, track.id)}
                    />
                  ))}
                </div>
              ) : (
                <LocalPanelEmptyState
                  kicker="Empty"
                  title="No linked tracks"
                  copy="This playlist exists, but the current library snapshot does not expose any matching tracks yet."
                />
              )}
            </>
          ) : playlists.length > 0 ? (
            <>
              <div className="playlist-browser-summary">
                <span className="playlist-browser-kicker">Synced library</span>
                <strong>{playlists.length} playlists ready</strong>
                <p>
                  Open a playlist to inspect the linked tracks and start playback
                  from the first song.
                </p>
              </div>

              <div className="playlist-list">
                {playlists.map((playlist) => {
                  const playlistTracks = getPlaylistTracks(playlist, songs);

                  return (
                    <button
                      key={playlist.id}
                      type="button"
                      className="playlist-card"
                      onClick={() => setSelectedPlaylistId(playlist.id)}
                    >
                      <span className="playlist-card-icon">{playlist.icon}</span>
                      <div className="playlist-card-info">
                        <div className="playlist-card-name">{playlist.name}</div>
                        <div className="playlist-card-count">
                          {formatSongCount(
                            Math.max(playlist.songCount, playlistTracks.length),
                          )}
                        </div>
                      </div>
                      <span className="playlist-card-arrow">›</span>
                    </button>
                  );
                })}
              </div>
            </>
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
  );
}
