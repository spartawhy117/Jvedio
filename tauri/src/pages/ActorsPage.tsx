/**
 * Actors Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/actors-page.md
 * Layout: query toolbar + actor card grid + pagination
 */

import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import "./pages.css";

export function ActorsPage() {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();

  const handleActorClick = (actorId: string) => {
    navigate("actor-detail", { actorId }, { label: t("actors") });
  };

  // Suppress unused warning — will be used in Phase 3
  void handleActorClick;

  return (
    <div className="page-content-section">
      <div className="page-header">
        <h2 className="page-title">{t("actors")}</h2>
      </div>

      {/* Query toolbar placeholder */}
      <div className="query-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder={tc("searchPlaceholder")}
          readOnly
        />
        <button className="btn btn-icon" title={tc("refresh")}>
          ↻
        </button>
        <div className="toolbar-spacer" />
        <button className="btn btn-secondary btn-sm">
          {tc("sortBy")} ▾
        </button>
      </div>

      <div className="empty-state">
        <span className="empty-icon">👤</span>
        <p>{tc("noResults")}</p>
        <p className="placeholder-hint">Phase 3 — actor card grid</p>
      </div>

      <div className="pagination-bar">
        <button className="btn btn-icon btn-sm" disabled>
          ‹
        </button>
        <span className="pagination-text">1 / 1</span>
        <button className="btn btn-icon btn-sm" disabled>
          ›
        </button>
      </div>
    </div>
  );
}
