/**
 * Library Management Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/library-management-page.md
 * - Library list from API (via BootstrapContext + SSE auto-refresh)
 * - Create / Edit / Delete / Scan operations
 * - Action strip per row
 * - Status badge (synced / scanning / pending)
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiMutation } from "../hooks/useApiQuery";
import { useOnLibraryChanged } from "../hooks/useSSESubscription";
import { showToast } from "../components/GlobalToast";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ActionStrip } from "../components/shared/ActionStrip";
import { StatusBadge } from "../components/shared/StatusBadge";
import { CreateEditLibraryDialog } from "../components/dialogs/CreateEditLibraryDialog";
import type {
  CreateLibraryRequest,
  CreateLibraryResponse,
  UpdateLibraryRequest,
  UpdateLibraryResponse,
  DeleteLibraryResponse,
  StartLibraryScanResponse,
  LibraryListItemDto,
} from "../api/types";
import "./pages.css";

export function LibraryManagementPage() {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();
  const { libraries } = useBootstrap();

  // ── Dialog state ──────────────────────────────────
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<LibraryListItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryListItemDto | null>(null);

  // SSE auto-refresh is handled by BootstrapContext; we just listen for toast feedback
  useOnLibraryChanged(() => {
    // Libraries auto-refresh in context — no additional action needed
  });

  // ── API mutations ─────────────────────────────────
  const createMutation = useApiMutation<CreateLibraryResponse, CreateLibraryRequest>({
    mutationFn: (req) => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.createLibrary(req);
    },
    onSuccess: (data) => {
      showToast({ message: t("toast.created", { name: data.name }), type: "success" });
      setCreateDialogOpen(false);
    },
    onError: (err) => {
      showToast({ message: err.message, type: "error" });
    },
  });

  const updateMutation = useApiMutation<UpdateLibraryResponse, { libraryId: string; req: UpdateLibraryRequest }>({
    mutationFn: ({ libraryId, req }) => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.updateLibrary(libraryId, req);
    },
    onSuccess: () => {
      showToast({ message: t("toast.updated"), type: "success" });
      setEditingLibrary(null);
    },
    onError: (err) => {
      showToast({ message: err.message, type: "error" });
    },
  });

  const deleteMutation = useApiMutation<DeleteLibraryResponse, string>({
    mutationFn: (libraryId) => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.deleteLibrary(libraryId);
    },
    onSuccess: () => {
      showToast({ message: t("toast.deleted"), type: "success" });
      setDeleteTarget(null);
    },
    onError: (err) => {
      showToast({ message: err.message, type: "error" });
    },
  });

  const scanMutation = useApiMutation<StartLibraryScanResponse, string>({
    mutationFn: (libraryId) => {
      const client = getApiClient();
      if (!client) throw new Error("API not connected");
      return client.startLibraryScan(libraryId);
    },
    onSuccess: () => {
      showToast({ message: t("toast.scanStarted"), type: "info" });
    },
    onError: (err) => {
      showToast({ message: err.message, type: "error" });
    },
  });

  // ── Handlers ──────────────────────────────────────
  const handleOpenLibrary = useCallback((libraryId: string) => {
    navigate("library", { libraryId }, { label: t("management.title") });
  }, [navigate, t]);

  const handleCreateSubmit = useCallback((data: { name: string; scanPaths: string[] }) => {
    createMutation.mutate(data);
  }, [createMutation]);

  const handleEditSubmit = useCallback((data: { name: string; scanPaths: string[] }) => {
    if (!editingLibrary) return;
    updateMutation.mutate({
      libraryId: editingLibrary.libraryId,
      req: { name: data.name, scanPaths: data.scanPaths },
    });
  }, [editingLibrary, updateMutation]);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.libraryId);
  }, [deleteTarget, deleteMutation]);

  const handleScan = useCallback((libraryId: string) => {
    scanMutation.mutate(libraryId);
  }, [scanMutation]);

  return (
    <div className="page-content-section">
      {/* Header */}
      <div className="page-header">
        <h2 className="page-title">{t("management.title")}</h2>
        <button className="btn btn-primary" onClick={() => setCreateDialogOpen(true)}>
          {t("management.createNew")}
        </button>
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
            <span className="col-count">{tc("videos")}</span>
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
                <StatusBadge
                  variant={lib.hasRunningTask ? "running" : "synced"}
                  label={
                    lib.hasRunningTask
                      ? t("management.scanning")
                      : t("management.synced")
                  }
                />
              </span>
              <span className="col-actions">
                <ActionStrip
                  actions={[
                    {
                      key: "open",
                      label: t("management.open"),
                      variant: "browse",
                      onClick: () => handleOpenLibrary(lib.libraryId),
                    },
                    {
                      key: "scan",
                      label: t("management.scan"),
                      variant: "execute",
                      onClick: () => handleScan(lib.libraryId),
                      disabled: lib.hasRunningTask,
                    },
                    {
                      key: "edit",
                      label: tc("edit"),
                      variant: "edit",
                      onClick: () => setEditingLibrary(lib),
                    },
                    {
                      key: "delete",
                      label: tc("delete"),
                      variant: "danger",
                      onClick: () => setDeleteTarget(lib),
                    },
                  ]}
                />
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Create Library Dialog */}
      <CreateEditLibraryDialog
        open={createDialogOpen}
        mode="create"
        loading={createMutation.isLoading}
        onSubmit={handleCreateSubmit}
        onCancel={() => setCreateDialogOpen(false)}
      />

      {/* Edit Library Dialog */}
      <CreateEditLibraryDialog
        open={!!editingLibrary}
        mode="edit"
        initialName={editingLibrary?.name}
        initialScanPaths={editingLibrary?.scanPaths}
        loading={updateMutation.isLoading}
        onSubmit={handleEditSubmit}
        onCancel={() => setEditingLibrary(null)}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        title={t("dialog.deleteTitle")}
        message={t("dialog.deleteMessage", { name: deleteTarget?.name ?? "" })}
        danger
        loading={deleteMutation.isLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
