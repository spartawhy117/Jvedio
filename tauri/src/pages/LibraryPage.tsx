/**
 * Library Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/library-page.md
 * Layout: query toolbar + video card grid + pagination
 */

import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import "./pages.css";

export function LibraryPage() {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { params, canGoBack, goBack } = useRouter();
  const { libraries } = useBootstrap();

  const library = libraries.find((l) => l.libraryId === params.libraryId);

  return (
    <div className="page-content-section">
      {/* Header with back button */}
      <div className="page-header">
        {canGoBack && (
          <button className="btn btn-icon" onClick={goBack} title={tc("back")}>
            ←
          </button>
        )}
        <h2 className="page-title">{library?.name || t("page.title")}</h2>
      </div>

      {/* Query toolbar placeholder */}
      <div className="query-toolbar">
        <input
          className="search-input"
          type="text"
          placeholder={t("page.filterPlaceholder")}
          readOnly
        />
        <button className="btn btn-icon" title={tc("refresh")}>
          ↻
        </button>
        <div className="toolbar-spacer" />
        <button className="btn btn-secondary btn-sm">
          {t("page.sortBy")} ▾
        </button>
      </div>

      {/* Video grid placeholder */}
      {library ? (
        <div className="video-grid-placeholder">
          <div className="empty-state">
            <span className="empty-icon">🎬</span>
            <p>
              {library.videoCount} {tc("videos")} · {library.path}
            </p>
            <p className="placeholder-hint">Phase 3 — video card grid</p>
          </div>
        </div>
      ) : (
        <div className="empty-state">
          <span className="empty-icon">❓</span>
          <p>{t("page.noLibrarySelected")}</p>
        </div>
      )}

      {/* Pagination placeholder */}
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
