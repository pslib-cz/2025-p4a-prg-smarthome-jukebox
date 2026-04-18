import type { ReactNode } from "react";
import type {
  JukeboxPlaylist,
  JukeboxTheme,
  JukeboxTrack,
} from "../state/jukeboxTypes";
import type {
  AppShellStatusViewModel,
} from "../state/appShellStatus";
import { MusicNoteIcon } from "./Icons";
import MusicPanelLocalLibrary from "./MusicPanelLocalLibrary";
import SpotifyLogoMark from "./SpotifyLogoMark";
import "./MusicPanel.css";

interface MusicPanelProps {
  theme: JukeboxTheme;
  modeControl: {
    icon: ReactNode;
    label: string;
  };
  songs: JukeboxTrack[];
  playlists: JukeboxPlaylist[];
  activeSongId: number;
  appStatus: AppShellStatusViewModel;
  onCycleMode: () => void;
  onOpenSpotifyPage: () => void;
  onSelectTrack: (trackId: number) => void;
  onPlayPlaylist: (playlistId: number, trackId?: number) => void;
}

export default function MusicPanel({
  theme,
  modeControl,
  songs,
  playlists,
  activeSongId,
  appStatus,
  onCycleMode,
  onOpenSpotifyPage,
  onSelectTrack,
  onPlayPlaylist,
}: MusicPanelProps) {
  return (
    <div className="playlist-panel" data-theme={theme}>
      <div className="playlist-header">
        <div className="playlist-title-group">
          <MusicNoteIcon className="playlist-icon" />
          <div className="music-panel-title-block">
            <h2 className="playlist-title">Local Music</h2>
            <span className="music-panel-subtitle">
              Owned library and playlists
            </span>
          </div>
        </div>

        <button className="mode-toggle" onClick={onCycleMode}>
          <span className="mode-icon">{modeControl.icon}</span>
          {modeControl.label}
        </button>
      </div>

      <MusicPanelLocalLibrary
        songs={songs}
        playlists={playlists}
        activeSongId={activeSongId}
        appStatus={appStatus}
        onSelectTrack={onSelectTrack}
        onPlayPlaylist={onPlayPlaylist}
      />

      <div className="spotify-section">
        <button
          className="btn-spotify connected"
          onClick={onOpenSpotifyPage}
        >
          <SpotifyLogoMark />
          Open Spotify Workspace
        </button>
      </div>
    </div>
  );
}
