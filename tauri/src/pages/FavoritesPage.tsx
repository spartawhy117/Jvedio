/**
 * Favorites Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/favorites-page.md
 * Layout: query toolbar + video card grid + pagination
 */

import { useTranslation } from "react-i18next";
import "./pages.css";

export function FavoritesPage() {
  const { t } = useTranslation("navigation");
  const { t: tc } = useTranslation("common");

  return (
    <div className="page-content-section">
      <div className="page-header">
        <h2 className="page-title">{t("favorites")}</h2>
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
        <span className="empty-icon">❤</span>
        <p>{tc("noResults")}</p>
        <p className="placeholder-hint">Phase 3 — favorites video grid</p>
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
