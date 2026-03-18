/**
 * Video Detail Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/video-detail-page.md
 * Layout: poster + metadata + actors + play button + back link
 */

import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import "./pages.css";

export function VideoDetailPage() {
  const { t: tc } = useTranslation("common");
  const { params, canGoBack, goBack, navigate } = useRouter();

  const handleActorClick = (actorId: string) => {
    navigate("actor-detail", { actorId }, { label: "Video Detail" });
  };

  // Suppress unused warning — will be used in Phase 3
  void handleActorClick;

  return (
    <div className="page-content-section">
      <div className="page-header">
        {canGoBack && (
          <button className="btn btn-icon" onClick={goBack} title={tc("back")}>
            ←
          </button>
        )}
        <h2 className="page-title">
          {params.videoId ? `Video: ${params.videoId}` : "Video Detail"}
        </h2>
      </div>

      {/* Video detail placeholder */}
      <div className="video-detail-layout">
        <div className="poster-placeholder">🎬</div>
        <div className="detail-info">
          <p className="placeholder-hint">
            {tc("videoId")}: {params.videoId ?? "—"}
          </p>
          <p className="placeholder-hint">Phase 3 — video metadata, actors, play button</p>

          <div className="detail-actions" style={{ marginTop: 16 }}>
            <button className="btn btn-primary">▶ {tc("play")}</button>
            <button className="btn btn-secondary">📂 {tc("openFolder")}</button>
          </div>
        </div>
      </div>

      {/* Sidecar status placeholder */}
      <h3 className="section-heading">Sidecar</h3>
      <div className="sidecar-placeholder">
        <span className="placeholder-hint">Phase 3 — NFO / poster / thumb / fanart status</span>
      </div>
    </div>
  );
}
