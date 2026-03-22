/**
 * Library Management Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/library-management-page.md
 * - Library list from API (via BootstrapContext + SSE auto-refresh)
 * - Create / Edit / Delete / Scan operations
 * - Action strip per row
 * - Status badge (synced / scanning / pending)
 */

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "../router";
import { useBootstrap } from "../contexts/BootstrapContext";
import { getApiClient } from "../api/client";
import { useApiMutation, useApiQuery } from "../hooks/useApiQuery";
import { useOnLibraryChanged } from "../hooks/useSSESubscription";
import { showToast } from "../components/GlobalToast";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { ActionStrip, type ActionVariant } from "../components/shared/ActionStrip";
import { StatusBadge } from "../components/shared/StatusBadge";
import { AppIcon } from "../components/shared/AppIcon";
import { CreateEditLibraryDialog } from "../components/dialogs/CreateEditLibraryDialog";
import type {
  CreateLibraryRequest,
  CreateLibraryResponse,
  UpdateLibraryRequest,
  UpdateLibraryResponse,
  DeleteLibraryResponse,
  StartLibraryScanResponse,
  LibraryListItemDto,
  GetTasksResponse,
  TaskItemDto,
} from "../api/types";
import "./pages.css";

function isTaskActive(task: TaskItemDto) {
  return task.status === "running" || task.status === "queued";
}

function selectLatestTask(current: TaskItemDto | undefined, next: TaskItemDto) {
  if (!current) {
    return next;
  }

  return new Date(next.updatedAtUtc).getTime() >= new Date(current.updatedAtUtc).getTime()
    ? next
    : current;
}

export function LibraryManagementPage() {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");
  const { navigate } = useRouter();
  const { libraries } = useBootstrap();

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editingLibrary, setEditingLibrary] = useState<LibraryListItemDto | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryListItemDto | null>(null);

  useOnLibraryChanged(() => {
    void tasksQuery.refetch();
  });

  const tasksQuery = useApiQuery<GetTasksResponse>({
    queryKey: "tasks:list",
    queryFn: () => {
      const client = getApiClient();
      if (!client) {
        throw new Error("API not connected");
      }

      return client.getTasks();
    },
    keepPreviousData: true,
  });

  const activeTasksByLibrary = useMemo(() => {
    const result = new Map<string, TaskItemDto>();
    for (const task of tasksQuery.data?.tasks ?? []) {
      if (!task.libraryId || !isTaskActive(task)) {
        continue;
      }

      result.set(task.libraryId, selectLatestTask(result.get(task.libraryId), task));
    }

    return result;
  }, [tasksQuery.data]);

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
      showToast({ message: "同步任务已启动。", type: "info" });
    },
    onError: (err) => {
      showToast({ message: err.message, type: "error" });
    },
  });

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
    <div className="page-content-section page-content-wide">
      <div className="page-activity-shell">
        <div className="page-title-row">
          <h2 className="page-title">{t("management.title")}</h2>
          <div className="page-title-actions">
            <button className="btn btn-primary" onClick={() => setCreateDialogOpen(true)}>
              {t("management.createNew")}
            </button>
          </div>
        </div>

        <div className="page-activity-body">
          {libraries.length === 0 ? (
            <div className="empty-state">
              <span className="empty-icon"><AppIcon name="library-management" size={44} /></span>
              <p>{t("management.noLibrary")}</p>
              <p className="placeholder-hint">{t("management.createFirst")}</p>
            </div>
          ) : (
            <div className="library-table">
              <div className="library-table-header">
                <span className="col-name">{tc("name")}</span>
                <span className="col-count">{tc("videos")}</span>
                <span className="col-scan">已扫描数量</span>
                <span className="col-status">完成度</span>
                <span className="col-actions">{tc("actions")}</span>
              </div>

              {libraries.map((lib) => {
                const isComplete = lib.isFullySynced || lib.completionPercent >= 100;
                const runningTask = isComplete ? undefined : activeTasksByLibrary.get(lib.libraryId);
                const progressPercent = isComplete
                  ? Math.max(100, lib.completionPercent)
                  : runningTask
                    ? Math.max(runningTask.percent, lib.completionPercent)
                    : lib.completionPercent;
                const buttonLabel = runningTask
                  ? `同步中 ${Math.max(runningTask.percent, 0)}%`
                  : isComplete && lib.videoCount > 0
                    ? "无需扫描"
                    : t("management.scan");
                const buttonVariant: ActionVariant = isComplete && lib.videoCount > 0 ? "danger" : "execute";
                const badgeVariant = runningTask
                  ? "running"
                  : isComplete && lib.videoCount > 0
                    ? "synced"
                    : lib.syncedVideoCount > 0
                      ? "pending"
                      : "failed";
                const badgeLabel = runningTask
                  ? "同步中"
                  : isComplete && lib.videoCount > 0
                    ? "已完成"
                    : lib.syncedVideoCount > 0
                      ? "待继续"
                      : "未开始";
                const progressText = isComplete && lib.videoCount > 0
                  ? "全部影片已完成目录与元数据同步。"
                  : runningTask
                    ? runningTask.summary
                    : lib.syncedVideoCount > 0
                      ? "仍有影片未完成目录整理或元数据拉取。"
                      : "尚未执行首次完整同步。";

                return (
                  <div key={lib.libraryId} className="library-table-row">
                    <span
                      className="col-name clickable"
                      onClick={() => handleOpenLibrary(lib.libraryId)}
                      title={lib.path}
                    >
                      <span className="lib-name">{lib.name}</span>
                    </span>
                    <span className="col-count">{lib.videoCount}</span>
                    <span className="col-scan">
                      <strong>{lib.syncedVideoCount}</strong>
                      <span className="library-inline-note">完整同步成功</span>
                    </span>
                    <span className="col-status">
                      <div className="library-progress-stack">
                        <div className="library-progress-header">
                          <span>{progressPercent}%</span>
                          <StatusBadge variant={badgeVariant} label={badgeLabel} />
                        </div>
                        <div className="library-progress-track">
                          <span
                            className={`library-progress-value ${isComplete ? "complete" : ""}`}
                            style={{ width: `${Math.max(0, Math.min(100, progressPercent))}%` }}
                          />
                        </div>
                        <span className="library-inline-note">
                          {runningTask
                            ? `${runningTask.percent}% · ${runningTask.progressCurrent}/${runningTask.progressTotal || 0}`
                            : progressText}
                        </span>
                      </div>
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
                            label: buttonLabel,
                            variant: buttonVariant,
                            onClick: () => handleScan(lib.libraryId),
                            disabled: !!runningTask,
                            title: isComplete ? "当前媒体库已经完成同步，再次点击会重新执行全量检查。" : undefined,
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
                );
              })}
            </div>
          )}
        </div>
      </div>

      <CreateEditLibraryDialog
        open={createDialogOpen}
        mode="create"
        loading={createMutation.isLoading}
        onSubmit={handleCreateSubmit}
        onCancel={() => setCreateDialogOpen(false)}
      />

      <CreateEditLibraryDialog
        open={!!editingLibrary}
        mode="edit"
        initialName={editingLibrary?.name}
        initialScanPaths={editingLibrary?.scanPaths}
        loading={updateMutation.isLoading}
        onSubmit={handleEditSubmit}
        onCancel={() => setEditingLibrary(null)}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title={t("dialog.deleteTitle")}
        message={t("dialog.deleteMessage", { name: deleteTarget?.name ?? "" })}
        details={deleteTarget ? (
          <>
            <div className="dialog-detail-row">
              <span className="dialog-detail-label">{tc("name")}</span>
              <span className="dialog-detail-value">{deleteTarget.name}</span>
            </div>
            <div className="dialog-detail-row">
              <span className="dialog-detail-label">{t("dialog.pathLabel")}</span>
              <span className="dialog-detail-value">{deleteTarget.path}</span>
            </div>
            <div className="dialog-detail-row">
              <span className="dialog-detail-label">{tc("videos")}</span>
              <span className="dialog-detail-value">{deleteTarget.videoCount}</span>
            </div>
          </>
        ) : null}
        danger
        loading={deleteMutation.isLoading}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
