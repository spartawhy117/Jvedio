/**
 * Settings Page — Phase 3 full implementation.
 *
 * Spec: doc/UI/new/pages/settings-page.md
 * Layout: left group nav + right form area
 * Groups: 基本, 图片, 扫描与导入, 网络, 库, MetaTube
 *
 * Reads settings via useApiQuery, saves via useApiMutation.
 * Auto-refreshes on SSE "settings.changed" events.
 */

import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeModeProvider";
import { changeLanguage } from "../locales/i18n";
import { getApiClient } from "../api/client";
import { useApiQuery, useApiMutation, invalidateQueries } from "../hooks/useApiQuery";
import { useOnSettingsChanged } from "../hooks/useSSESubscription";
import { showToast } from "../components/GlobalToast";
import type { ThemeMode } from "../theme/theme-mode-store";
import type {
  GetSettingsResponse,
  UpdateSettingsRequest,
  UpdateSettingsResponse,
  RunMetaTubeDiagnosticsResponse,
} from "../api/types";
import "./pages.css";

// ── Constants ───────────────────────────────────────────

const SETTING_GROUPS = [
  "general",
  "image",
  "scanImport",
  "network",
  "library",
  "metaTube",
] as const;

type SettingGroup = (typeof SETTING_GROUPS)[number];

// ── Local form state ────────────────────────────────────

interface SettingsFormState {
  // General
  currentLanguage: string;
  debug: boolean;
  // Image
  posterPriority: string;
  cacheSizeLimitMb: number;
  autoCleanExpiredCache: boolean;
  // ScanImport
  scanDepth: number;
  excludePatterns: string;
  organizeMode: string;
  // Playback (mapped to network group in UI)
  playerPath: string;
  useSystemDefaultFallback: boolean;
  // Library
  defaultAutoScan: boolean;
  defaultSortBy: string;
  defaultSortOrder: string;
  // MetaTube
  metaTubeServerUrl: string;
  metaTubeTimeoutSeconds: number;
}

function toFormState(settings: GetSettingsResponse): SettingsFormState {
  return {
    currentLanguage: settings.general.currentLanguage,
    debug: settings.general.debug,
    posterPriority: settings.image.posterPriority,
    cacheSizeLimitMb: settings.image.cacheSizeLimitMb,
    autoCleanExpiredCache: settings.image.autoCleanExpiredCache,
    scanDepth: settings.scanImport.scanDepth,
    excludePatterns: settings.scanImport.excludePatterns,
    organizeMode: settings.scanImport.organizeMode,
    playerPath: settings.playback.playerPath,
    useSystemDefaultFallback: settings.playback.useSystemDefaultFallback,
    defaultAutoScan: settings.library.defaultAutoScan,
    defaultSortBy: settings.library.defaultSortBy,
    defaultSortOrder: settings.library.defaultSortOrder,
    metaTubeServerUrl: settings.metaTube.serverUrl,
    metaTubeTimeoutSeconds: settings.metaTube.requestTimeoutSeconds,
  };
}

function toUpdateRequest(form: SettingsFormState): UpdateSettingsRequest {
  return {
    general: {
      currentLanguage: form.currentLanguage,
      debug: form.debug,
    },
    image: {
      posterPriority: form.posterPriority,
      cacheSizeLimitMb: form.cacheSizeLimitMb,
      autoCleanExpiredCache: form.autoCleanExpiredCache,
    },
    scanImport: {
      scanDepth: form.scanDepth,
      excludePatterns: form.excludePatterns,
      organizeMode: form.organizeMode,
    },
    playback: {
      playerPath: form.playerPath,
      useSystemDefaultFallback: form.useSystemDefaultFallback,
    },
    library: {
      defaultAutoScan: form.defaultAutoScan,
      defaultSortBy: form.defaultSortBy,
      defaultSortOrder: form.defaultSortOrder,
    },
    metaTube: {
      serverUrl: form.metaTubeServerUrl,
      requestTimeoutSeconds: form.metaTubeTimeoutSeconds,
    },
  };
}

const DEFAULT_FORM: SettingsFormState = {
  currentLanguage: "zh",
  debug: false,
  posterPriority: "remote",
  cacheSizeLimitMb: 0,
  autoCleanExpiredCache: true,
  scanDepth: 0,
  excludePatterns: "",
  organizeMode: "none",
  playerPath: "",
  useSystemDefaultFallback: true,
  defaultAutoScan: true,
  defaultSortBy: "releaseDate",
  defaultSortOrder: "desc",
  metaTubeServerUrl: "",
  metaTubeTimeoutSeconds: 30,
};

// ── Component ───────────────────────────────────────────

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { themeMode, setThemeMode } = useTheme();
  const { i18n } = useTranslation();
  const [activeGroup, setActiveGroup] = useState<SettingGroup>("general");
  const [form, setForm] = useState<SettingsFormState>(DEFAULT_FORM);
  const [dirty, setDirty] = useState(false);

  // ── Read settings from Worker ─────────────────────
  const settingsQuery = useApiQuery<GetSettingsResponse>({
    queryKey: "settings",
    queryFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("ApiClient not initialized");
      return client.getSettings();
    },
    keepPreviousData: true,
  });

  // Sync form state when settings are loaded/refreshed
  useEffect(() => {
    if (settingsQuery.data) {
      setForm(toFormState(settingsQuery.data));
      setDirty(false);
    }
  }, [settingsQuery.data]);

  // ── Auto-refresh on SSE settings.changed ──────────
  useOnSettingsChanged(() => {
    settingsQuery.refetch();
  });

  // ── Save mutation ─────────────────────────────────
  const saveMutation = useApiMutation<UpdateSettingsResponse, UpdateSettingsRequest>({
    mutationFn: (req) => {
      const client = getApiClient();
      if (!client) throw new Error("ApiClient not initialized");
      return client.updateSettings(req);
    },
    onSuccess: (data) => {
      setForm(toFormState(data.settings));
      setDirty(false);
      invalidateQueries("settings");
      showToast({ message: t("saveSuccess"), type: "success" });
    },
    onError: (err) => {
      showToast({ message: `${t("saveFailed")}: ${err.message}`, type: "error" });
    },
  });

  // ── Reset mutation ────────────────────────────────
  const resetMutation = useApiMutation<UpdateSettingsResponse, void>({
    mutationFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("ApiClient not initialized");
      return client.resetSettings();
    },
    onSuccess: (data) => {
      setForm(toFormState(data.settings));
      setDirty(false);
      invalidateQueries("settings");
      showToast({ message: t("resetSuccess"), type: "success" });
    },
    onError: (err) => {
      showToast({ message: `${t("saveFailed")}: ${err.message}`, type: "error" });
    },
  });

  // ── MetaTube diagnostics mutation ─────────────────
  const [diagResult, setDiagResult] = useState<RunMetaTubeDiagnosticsResponse | null>(null);
  const diagMutation = useApiMutation<RunMetaTubeDiagnosticsResponse, void>({
    mutationFn: () => {
      const client = getApiClient();
      if (!client) throw new Error("ApiClient not initialized");
      return client.runMetaTubeDiagnostics({
        serverUrl: form.metaTubeServerUrl || undefined,
        timeoutSeconds: form.metaTubeTimeoutSeconds || undefined,
      });
    },
    onSuccess: (data) => {
      setDiagResult(data);
      if (data.success) {
        showToast({ message: t("metaTubeSettings.diagSuccess"), type: "success" });
      } else {
        showToast({ message: `${t("metaTubeSettings.diagFailed")}: ${data.summary}`, type: "error" });
      }
    },
    onError: (err) => {
      showToast({ message: `${t("metaTubeSettings.diagFailed")}: ${err.message}`, type: "error" });
    },
  });

  // ── Form helpers ──────────────────────────────────
  const updateField = useCallback(<K extends keyof SettingsFormState>(
    key: K,
    value: SettingsFormState[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
  }, []);

  const handleSave = () => {
    saveMutation.mutate(toUpdateRequest(form));
  };

  const handleReset = () => {
    resetMutation.mutate(undefined as never);
  };

  const isSaving = saveMutation.isLoading || resetMutation.isLoading;

  // ── Render ────────────────────────────────────────
  return (
    <div className="settings-layout">
      {/* Left: group navigation */}
      <aside className="settings-nav">
        <h2 className="settings-nav-title">{t("title")}</h2>
        {SETTING_GROUPS.map((group) => (
          <button
            key={group}
            className={`settings-nav-item ${activeGroup === group ? "active" : ""}`}
            onClick={() => setActiveGroup(group)}
          >
            {t(`groups_list.${group}`)}
          </button>
        ))}
      </aside>

      {/* Right: form area */}
      <div className="settings-form-area">
        <div className="settings-form-header">
          <h3>{t(`groups_list.${activeGroup}`)}</h3>
        </div>

        {/* ─── General Group ─────────────────────────── */}
        {activeGroup === "general" && (
          <div className="settings-form-content">
            {/* Theme */}
            <section className="settings-group">
              <h4>{t("theme.label")}</h4>
              <div className="settings-row">
                {(["light", "dark", "system"] as ThemeMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`settings-chip ${themeMode === mode ? "active" : ""}`}
                    onClick={() => setThemeMode(mode)}
                  >
                    {t(`theme.${mode}`)}
                  </button>
                ))}
              </div>
            </section>

            {/* Language */}
            <section className="settings-group">
              <h4>{t("language.label")}</h4>
              <div className="settings-row">
                {(["zh", "en"] as const).map((lang) => (
                  <button
                    key={lang}
                    className={`settings-chip ${i18n.language === lang ? "active" : ""}`}
                    onClick={() => {
                      changeLanguage(lang);
                      updateField("currentLanguage", lang);
                    }}
                  >
                    {t(`language.${lang}`)}
                  </button>
                ))}
              </div>
            </section>

            {/* Debug */}
            <section className="settings-group">
              <h4>{tc("debug")}</h4>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={form.debug}
                  onChange={(e) => updateField("debug", e.target.checked)}
                />
                <span>{t("debugMode")}</span>
              </label>
            </section>
          </div>
        )}

        {/* ─── Image Group ───────────────────────────── */}
        {activeGroup === "image" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>{t("imageSettings.posterDisplay")}</h4>
              <div className="settings-row">
                {(["remote", "local"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`settings-chip ${form.posterPriority === mode ? "active" : ""}`}
                    onClick={() => updateField("posterPriority", mode)}
                  >
                    {t(`imageSettings.posterPriority_${mode}`)}
                  </button>
                ))}
              </div>
            </section>
            <section className="settings-group">
              <h4>{t("imageSettings.cachePolicy")}</h4>
              <div className="settings-input-group">
                <input
                  type="number"
                  className="settings-input settings-input-sm"
                  value={form.cacheSizeLimitMb}
                  onChange={(e) => updateField("cacheSizeLimitMb", parseInt(e.target.value) || 0)}
                  min={0}
                />
                <span className="settings-input-suffix">MB</span>
                <span className="settings-input-hint">{t("imageSettings.cacheSizeHint")}</span>
              </div>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={form.autoCleanExpiredCache}
                  onChange={(e) => updateField("autoCleanExpiredCache", e.target.checked)}
                />
                <span>{t("imageSettings.autoClean")}</span>
              </label>
            </section>
          </div>
        )}

        {/* ─── Scan & Import Group ───────────────────── */}
        {activeGroup === "scanImport" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>{t("scanImportSettings.scanBehavior")}</h4>
              <div className="settings-input-group">
                <label className="settings-label">{t("scanImportSettings.scanDepthLabel")}</label>
                <input
                  type="number"
                  className="settings-input settings-input-sm"
                  value={form.scanDepth}
                  onChange={(e) => updateField("scanDepth", parseInt(e.target.value) || 0)}
                  min={0}
                />
                <span className="settings-input-hint">{t("scanImportSettings.scanDepthHint")}</span>
              </div>
              <div className="settings-input-group">
                <label className="settings-label">{t("scanImportSettings.excludeLabel")}</label>
                <input
                  type="text"
                  className="settings-input"
                  value={form.excludePatterns}
                  onChange={(e) => updateField("excludePatterns", e.target.value)}
                  placeholder={t("scanImportSettings.excludePlaceholder")}
                />
              </div>
            </section>
            <section className="settings-group">
              <h4>{t("scanImportSettings.organizeRules")}</h4>
              <div className="settings-row">
                {(["none", "byVid", "byActor"] as const).map((mode) => (
                  <button
                    key={mode}
                    className={`settings-chip ${form.organizeMode === mode ? "active" : ""}`}
                    onClick={() => updateField("organizeMode", mode)}
                  >
                    {t(`scanImportSettings.organizeMode_${mode}`)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ─── Network Group ─────────────────────────── */}
        {activeGroup === "network" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>{t("networkSettings.playerPath")}</h4>
              <div className="settings-input-group">
                <input
                  type="text"
                  className="settings-input"
                  value={form.playerPath}
                  onChange={(e) => updateField("playerPath", e.target.value)}
                  placeholder={t("networkSettings.playerPathPlaceholder")}
                />
              </div>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={form.useSystemDefaultFallback}
                  onChange={(e) => updateField("useSystemDefaultFallback", e.target.checked)}
                />
                <span>{t("networkSettings.useSystemDefault")}</span>
              </label>
            </section>
          </div>
        )}

        {/* ─── Library Group ─────────────────────────── */}
        {activeGroup === "library" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>{t("librarySettings.defaultBehavior")}</h4>
              <label className="settings-checkbox">
                <input
                  type="checkbox"
                  checked={form.defaultAutoScan}
                  onChange={(e) => updateField("defaultAutoScan", e.target.checked)}
                />
                <span>{t("librarySettings.autoScanLabel")}</span>
              </label>
            </section>
            <section className="settings-group">
              <h4>{t("librarySettings.defaultSort")}</h4>
              <div className="settings-row">
                {(["releaseDate", "title", "lastPlayedAt", "lastScanAt"] as const).map((sortBy) => (
                  <button
                    key={sortBy}
                    className={`settings-chip ${form.defaultSortBy === sortBy ? "active" : ""}`}
                    onClick={() => updateField("defaultSortBy", sortBy)}
                  >
                    {t(`librarySettings.sortBy_${sortBy}`)}
                  </button>
                ))}
              </div>
              <div className="settings-row" style={{ marginTop: "8px" }}>
                {(["desc", "asc"] as const).map((order) => (
                  <button
                    key={order}
                    className={`settings-chip ${form.defaultSortOrder === order ? "active" : ""}`}
                    onClick={() => updateField("defaultSortOrder", order)}
                  >
                    {t(`librarySettings.sortOrder_${order}`)}
                  </button>
                ))}
              </div>
            </section>
          </div>
        )}

        {/* ─── MetaTube Group ────────────────────────── */}
        {activeGroup === "metaTube" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>{t("metaTubeSettings.serverUrl")}</h4>
              <div className="settings-input-group">
                <input
                  type="text"
                  className="settings-input"
                  value={form.metaTubeServerUrl}
                  onChange={(e) => updateField("metaTubeServerUrl", e.target.value)}
                  placeholder="http://127.0.0.1:8080"
                />
              </div>
            </section>

            <section className="settings-group">
              <h4>{t("metaTubeSettings.timeout")}</h4>
              <div className="settings-input-group">
                <input
                  type="number"
                  className="settings-input settings-input-sm"
                  value={form.metaTubeTimeoutSeconds}
                  onChange={(e) => updateField("metaTubeTimeoutSeconds", parseInt(e.target.value) || 0)}
                  min={5}
                  max={120}
                />
                <span className="settings-input-suffix">s</span>
              </div>
            </section>

            <section className="settings-group">
              <h4>{t("metaTubeSettings.diagnostics")}</h4>
              <button
                className="btn btn-secondary"
                onClick={() => diagMutation.mutate(undefined as never)}
                disabled={diagMutation.isLoading}
              >
                {diagMutation.isLoading ? tc("loading") : t("metaTubeSettings.runDiagnostics")}
              </button>
              {diagResult && (
                <div className={`diag-result ${diagResult.success ? "success" : "failure"}`}>
                  <span>{diagResult.success ? "✓" : "✗"}</span>
                  <span>
                    {diagResult.success
                      ? `${t("metaTubeSettings.diagSuccess")}: ${diagResult.summary}`
                      : `${t("metaTubeSettings.diagFailed")}: ${diagResult.summary}`}
                  </span>
                </div>
              )}
            </section>
          </div>
        )}

        {/* Loading / Error states */}
        {settingsQuery.isLoading && !settingsQuery.data && (
          <div className="settings-loading">
            <span>{tc("loading")}</span>
          </div>
        )}
        {settingsQuery.isError && (
          <div className="settings-error">
            <span>⚠ {settingsQuery.error?.message}</span>
            <button className="btn btn-sm btn-secondary" onClick={() => settingsQuery.refetch()}>
              {tc("refresh")}
            </button>
          </div>
        )}

        {/* Bottom actions */}
        <div className="settings-actions">
          <button
            className="btn btn-secondary"
            onClick={handleReset}
            disabled={isSaving}
          >
            {t("resetDefaults")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={isSaving || !dirty}
          >
            {isSaving ? tc("loading") : t("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
