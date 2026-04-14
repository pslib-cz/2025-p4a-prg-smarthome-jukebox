interface PlaylistItemProps {
  title: string;
  artist: string;
  duration: string;
  coverUrl: string;
  isActive: boolean;
  onClick: () => void;
}

export default function PlaylistItem({
  title,
  artist,
  duration,
  coverUrl,
  isActive,
  onClick,
}: PlaylistItemProps) {
  return (
    <div
      className={`playlist-item ${isActive ? "active" : ""}`}
      onClick={onClick}
    >
      {isActive ? (
        <div className="play-indicator">
          <img src={coverUrl} alt={title} />
          <div className="play-overlay">
            <span className="play-overlay-icon">▶</span>
          </div>
        </div>
      ) : (
        <img className="playlist-cover" src={coverUrl} alt={title} />
      )}
      <div className="playlist-item-info">
        <div className="playlist-item-title">{title}</div>
        <div className="playlist-item-artist">{artist}</div>
      </div>
      <span className="playlist-item-duration">{duration}</span>
    </div>
  );
}
