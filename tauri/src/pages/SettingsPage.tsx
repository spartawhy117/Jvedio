/**
 * Settings Page — Phase 2 skeleton.
 *
 * Spec: doc/UI/new/pages/settings-page.md
 * Layout: left group nav + right form area
 * Groups: 基本, 图片, 扫描与导入, 网络, 库, MetaTube
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "../theme/ThemeModeProvider";
import { changeLanguage } from "../locales/i18n";
import type { ThemeMode } from "../theme/theme-mode-store";
import "./pages.css";

const SETTING_GROUPS = [
  "general",
  "image",
  "scanImport",
  "network",
  "library",
  "metaTube",
] as const;

type SettingGroup = (typeof SETTING_GROUPS)[number];

export function SettingsPage() {
  const { t } = useTranslation("settings");
  const { t: tc } = useTranslation("common");
  const { themeMode, setThemeMode } = useTheme();
  const { i18n } = useTranslation();
  const [activeGroup, setActiveGroup] = useState<SettingGroup>("general");

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
                    onClick={() => changeLanguage(lang)}
                  >
                    {t(`language.${lang}`)}
                  </button>
                ))}
              </div>
            </section>

            {/* Debug placeholder */}
            <section className="settings-group">
              <h4>{tc("debug")}</h4>
              <p className="placeholder-hint">Phase 3 — {tc("loading")}</p>
            </section>
          </div>
        )}

        {activeGroup === "metaTube" && (
          <div className="settings-form-content">
            <section className="settings-group">
              <h4>MetaTube Server</h4>
              <p className="placeholder-hint">Phase 3 — MetaTube settings + diagnostics</p>
            </section>
          </div>
        )}

        {activeGroup !== "general" && activeGroup !== "metaTube" && (
          <div className="settings-form-content">
            <div className="empty-state">
              <span className="empty-icon">⚙</span>
              <p>{t(`groups_list.${activeGroup}`)}</p>
              <p className="placeholder-hint">Phase 3 — {tc("loading")}</p>
            </div>
          </div>
        )}

        {/* Bottom actions */}
        <div className="settings-actions">
          <button className="btn btn-secondary">{t("resetDefaults")}</button>
          <button className="btn btn-primary">{t("save")}</button>
        </div>
      </div>
    </div>
  );
}
