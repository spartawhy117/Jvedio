/**
 * Video Card — unified video result item.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 统一影片卡片
 *
 * Structure:
 * - Large image area (poster/thumb)
 * - Top-right checkbox
 * - Bottom status bar
 * - VID line
 * - Release date line
 * - Hover/right-click action entry
 */

import type { VideoListItemDto } from "../../api/types";
import "./VideoCard.css";

export interface VideoCardProps {
  video: VideoListItemDto;
  selected?: boolean;
  onSelect?: (videoId: string) => void;
  onClick?: (videoId: string) => void;
  onContextMenu?: (videoId: string, event: React.MouseEvent) => void;
  /** Worker base URL for image proxy */
  baseUrl?: string;
}

export function VideoCard({
  video,
  selected = false,
  onSelect,
  onClick,
  onContextMenu,
  baseUrl,
}: VideoCardProps) {
  const releaseDate = video.releaseDate
    ? new Date(video.releaseDate).toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "2-digit",
      })
    : "";

  const posterUrl = video.hasPoster && baseUrl
    ? `${baseUrl}/api/videos/${encodeURIComponent(video.videoId)}/poster`
    : null;

  const handleClick = () => onClick?.(video.videoId);
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    onContextMenu?.(video.videoId, e);
  };
  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect?.(video.videoId);
  };

  return (
    <div
      className={`video-card ${selected ? "selected" : ""}`}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
    >
      {/* Image area */}
      <div className="video-card-image">
        {posterUrl ? (
          <img src={posterUrl} alt={video.vid} loading="lazy" />
        ) : (
          <div className="video-card-no-image">
            <svg className="no-poster-placeholder" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="8" y="6" width="32" height="36" rx="3" stroke="currentColor" strokeWidth="2" />
              <circle cx="24" cy="20" r="6" stroke="currentColor" strokeWidth="2" />
              <path d="M14 38c0-5.523 4.477-10 10-10s10 4.477 10 10" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span className="no-poster-text">No Poster</span>
          </div>
        )}

        {/* Checkbox */}
        <button
          className={`video-card-checkbox ${selected ? "checked" : ""}`}
          onClick={handleCheckboxClick}
        >
          {selected ? "✓" : ""}
        </button>

        {/* Bottom status bar */}
        <div className="video-card-status-bar">
          {video.hasNfo && <span className="status-dot nfo" title="NFO" />}
          {video.hasPoster && <span className="status-dot poster" title="Poster" />}
          {video.hasMissingAssets && (
            <span className="status-dot missing" title="Missing assets" />
          )}
        </div>
      </div>

      {/* Text area */}
      <div className="video-card-text">
        <div className="video-card-vid">
          {video.isFavorite && <span className="video-card-fav-icon" title="Favorite">❤</span>}
          {video.vid}
        </div>
        {releaseDate && (
          <div className="video-card-date">{releaseDate}</div>
        )}
      </div>
    </div>
  );
}
