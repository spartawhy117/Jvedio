/**
 * Actor Card — unified actor result item.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 统一演员卡片
 *
 * Structure:
 * - Vertical avatar area
 * - Centered name
 * - Secondary info (video count)
 */

import "./ActorCard.css";

export interface ActorCardData {
  actorId: string;
  avatarPath?: string | null;
  name: string;
  videoCount?: number | null;
}

export interface ActorCardProps {
  actor: ActorCardData;
  onClick?: (actorId: string) => void;
  baseUrl?: string;
  compact?: boolean;
  subtitle?: string | null;
}

export function ActorCard({
  actor,
  onClick,
  baseUrl,
  compact = false,
  subtitle,
}: ActorCardProps) {
  const avatarUrl = actor.avatarPath && baseUrl
    ? `${baseUrl}/api/actors/${encodeURIComponent(actor.actorId)}/avatar`
    : null;
  const infoText = subtitle !== undefined
    ? subtitle
    : typeof actor.videoCount === "number"
      ? `${actor.videoCount} videos`
      : null;

  return (
    <div
      className={`actor-card ${compact ? "actor-card-compact" : ""}`}
      onClick={() => onClick?.(actor.actorId)}
    >
      <div className="actor-card-avatar">
        {avatarUrl ? (
          <img src={avatarUrl} alt={actor.name} loading="lazy" />
        ) : (
          <div className="actor-card-no-avatar">👤</div>
        )}
      </div>
      <div className="actor-card-name">{actor.name}</div>
      {infoText ? <div className="actor-card-info">{infoText}</div> : null}
    </div>
  );
}
