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
  // MetaTube
  metaTubeServerUrl: string;
  metaTubeTimeoutSeconds: number;
  // Playback (mapped to network group in UI)
  playerPath: string;
  useSystemDefaultFallback: boolean;
}

function toFormState(settings: GetSettingsResponse): SettingsFormState {
  return {
    currentLanguage: settings.general.currentLanguage,
    debug: settings.general.debug,
    metaTubeServerUrl: settings.metaTube.serverUrl,
    metaTubeTimeoutSeconds: settings.metaTube.requestTimeoutSeconds,
    playerPath: settings.playback.playerPath,
    useSystemDefaultFallback: settings.playback.useSystemDefaultFallback,
  };
}

function toUpdateRequest(form: SettingsFormState): UpdateSettingsRequest {
  return {
    general: {
      currentLanguage: form.currentLanguage,
      debug: form.debug,
    },
    metaTube: {
      serverUrl: form.metaTubeServerUrl,
      requestTimeoutSeconds: form.metaTubeTimeoutSeconds,
    },
    playback: {
      playerPath: form.playerPath,
      useSystemDefaultFallback: form.useSystemDefaultFallback,
    },
  };
}

const DEFAULT_FORM: SettingsFormState = {
  currentLanguage: "zh",
  debug: false,
  metaTubeServerUrl: "",
  metaTubeTimeoutSeconds: 30,
  playerPath: "",
  useSystemDefaultFallback: true,
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
        showToast({ message: `${t("metaTubeSettings.diagFailed")}: ${data.errorMessage ?? "Unknown"}`, type: "error" });
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
              <p className="settings-hint-text">{t("imageSettings.posterHint")}</p>
            </section>
            <section className="settings-group">
              <h4>{t("imageSettings.cachePolicy")}</h4>
              <p className="settings-hint-text">{t("imageSettings.cacheHint")}</p>
            </section>
          </div>
        )}

        {/* ─── Scan & Import Group ───────────────────── */}
        {activeGroup === "scanImport" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>{t("scanImportSettings.scanBehavior")}</h4>
              <p className="settings-hint-text">{t("scanImportSettings.scanHint")}</p>
            </section>
            <section className="settings-group">
              <h4>{t("scanImportSettings.organizeRules")}</h4>
              <p className="settings-hint-text">{t("scanImportSettings.organizeHint")}</p>
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
              <p className="settings-hint-text">{t("librarySettings.behaviorHint")}</p>
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
                      ? `${t("metaTubeSettings.diagSuccess")} (${diagResult.responseTimeMs}ms)`
                      : `${t("metaTubeSettings.diagFailed")}: ${diagResult.errorMessage ?? "Unknown"}`}
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
