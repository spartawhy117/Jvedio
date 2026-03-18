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

import type { ActorListItemDto } from "../../api/types";
import "./ActorCard.css";

export interface ActorCardProps {
  actor: ActorListItemDto;
  onClick?: (actorId: string) => void;
  baseUrl?: string;
}

export function ActorCard({ actor, onClick, baseUrl }: ActorCardProps) {
  const avatarUrl = actor.avatarPath && baseUrl
    ? `${baseUrl}/api/actors/${encodeURIComponent(actor.actorId)}/avatar`
    : null;

  return (
    <div
      className="actor-card"
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
      <div className="actor-card-info">{actor.videoCount} videos</div>
    </div>
  );
}
