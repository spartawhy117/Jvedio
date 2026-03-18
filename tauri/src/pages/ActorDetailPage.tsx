/**
 * Actor Detail Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/actor-detail-page.md
 * Layout: actor header + associated videos grid
 */

import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import "./pages.css";

export function ActorDetailPage() {
  const { t: tc } = useTranslation("common");
  const { params, canGoBack, goBack, navigate } = useRouter();

  const handleVideoClick = (videoId: string) => {
    navigate("video-detail", { videoId }, { label: "Actor Detail" });
  };

  // Suppress unused warning — will be used in Phase 3
  void handleVideoClick;

  return (
    <div className="page-content-section">
      <div className="page-header">
        {canGoBack && (
          <button className="btn btn-icon" onClick={goBack} title={tc("back")}>
            ←
          </button>
        )}
        <h2 className="page-title">
          {params.actorId ? `Actor: ${params.actorId}` : "Actor Detail"}
        </h2>
      </div>

      {/* Actor info placeholder */}
      <div className="detail-header-placeholder">
        <div className="avatar-placeholder">👤</div>
        <div className="detail-info">
          <p className="placeholder-hint">Phase 3 — actor profile header</p>
          <p className="placeholder-hint">
            {tc("actorId")}: {params.actorId ?? "—"}
          </p>
        </div>
      </div>

      {/* Associated videos placeholder */}
      <h3 className="section-heading">{tc("associatedVideos")}</h3>
      <div className="empty-state">
        <span className="empty-icon">🎬</span>
        <p>{tc("noResults")}</p>
        <p className="placeholder-hint">Phase 3 — actor video grid</p>
      </div>
    </div>
  );
}
