/**
 * Library Management Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/library-management-page.md
 * Layout: list with action strip per row
 */

import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import "./pages.css";

export function LibraryManagementPage() {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();
  const { libraries } = useBootstrap();

  const handleOpenLibrary = (libraryId: string) => {
    navigate("library", { libraryId }, { label: t("management.title") });
  };

  return (
    <div className="page-content-section">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">{t("management.title")}</h2>
        <button className="btn btn-primary">{t("management.createNew")}</button>
      </div>

      {libraries.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📁</span>
          <p>{t("management.noLibrary")}</p>
          <p className="placeholder-hint">{t("management.createFirst")}</p>
        </div>
      ) : (
        <div className="library-table">
          {/* Table header */}
          <div className="library-table-header">
            <span className="col-name">{tc("name")}</span>
            <span className="col-count">{t("management.videoCount")}</span>
            <span className="col-scan">{t("management.lastScan")}</span>
            <span className="col-status">{tc("status.label")}</span>
            <span className="col-actions">{tc("actions")}</span>
          </div>

          {/* Table rows */}
          {libraries.map((lib) => (
            <div key={lib.libraryId} className="library-table-row">
              <span
                className="col-name clickable"
                onClick={() => handleOpenLibrary(lib.libraryId)}
                title={lib.path}
              >
                <span className="lib-name">{lib.name}</span>
                <span className="lib-path">{lib.path}</span>
              </span>
              <span className="col-count">{lib.videoCount}</span>
              <span className="col-scan">
                {lib.lastScanAt
                  ? new Date(lib.lastScanAt).toLocaleDateString()
                  : tc("notRecorded")}
              </span>
              <span className="col-status">
                <span
                  className={`status-badge ${lib.hasRunningTask ? "running" : "synced"}`}
                >
                  {lib.hasRunningTask
                    ? t("management.scanning")
                    : t("management.synced")}
                </span>
              </span>
              <span className="col-actions">
                <button
                  className="btn btn-sm btn-secondary"
                  onClick={() => handleOpenLibrary(lib.libraryId)}
                >
                  {t("management.open")}
                </button>
                <button className="btn btn-sm btn-primary">
                  {t("management.scan")}
                </button>
                <button className="btn btn-sm btn-secondary">
                  {tc("edit")}
                </button>
                <button className="btn btn-sm btn-danger">
                  {tc("delete")}
                </button>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
