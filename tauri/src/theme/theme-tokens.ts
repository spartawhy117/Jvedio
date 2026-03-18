/**
 * Design token definitions for light and dark themes.
 *
 * These map to CSS custom properties applied to :root.
 * Mirrors: doc/UI/new/foundation/theme-and-appearance.md token table.
 */

import type { ResolvedTheme } from "./theme-mode-store";

export interface ThemeTokens {
  // ── Base tokens ──────────────────────────
  "--color-bg-app": string;
  "--color-bg-surface-1": string;
  "--color-bg-surface-2": string;
  "--color-border-default": string;
  "--color-text-primary": string;
  "--color-text-secondary": string;
  "--color-icon-primary": string;
  "--color-icon-muted": string;
  "--color-icon-on-accent": string;
  "--color-accent-primary": string;
  "--color-danger": string;
  "--color-success": string;
  "--color-warning": string;

  // ── Component semantic tokens ────────────
  "--shell-sidebar-bg": string;
  "--shell-content-bg": string;
  "--card-bg": string;
  "--card-border": string;
  "--badge-info-bg": string;
  "--badge-danger-bg": string;
  "--summary-strip-bg": string;
  "--dialog-overlay": string;
}

const lightTokens: ThemeTokens = {
  "--color-bg-app": "#ffffff",
  "--color-bg-surface-1": "#f5f5f5",
  "--color-bg-surface-2": "#ebebeb",
  "--color-border-default": "#e0e0e0",
  "--color-text-primary": "#1a1a1a",
  "--color-text-secondary": "#666666",
  "--color-icon-primary": "#333333",
  "--color-icon-muted": "#999999",
  "--color-icon-on-accent": "#ffffff",
  "--color-accent-primary": "#4a90d9",
  "--color-danger": "#e05050",
  "--color-success": "#4caf50",
  "--color-warning": "#ff9800",

  "--shell-sidebar-bg": "#fafafa",
  "--shell-content-bg": "#ffffff",
  "--card-bg": "#f5f5f5",
  "--card-border": "#e0e0e0",
  "--badge-info-bg": "#e8f0fe",
  "--badge-danger-bg": "#fde8e8",
  "--summary-strip-bg": "#f5f5f5",
  "--dialog-overlay": "rgba(0, 0, 0, 0.4)",
};

const darkTokens: ThemeTokens = {
  "--color-bg-app": "#1a1a1a",
  "--color-bg-surface-1": "#242424",
  "--color-bg-surface-2": "#2e2e2e",
  "--color-border-default": "#333333",
  "--color-text-primary": "#e0e0e0",
  "--color-text-secondary": "#999999",
  "--color-icon-primary": "#cccccc",
  "--color-icon-muted": "#777777",
  "--color-icon-on-accent": "#ffffff",
  "--color-accent-primary": "#5ba0e0",
  "--color-danger": "#e05050",
  "--color-success": "#4caf50",
  "--color-warning": "#ff9800",

  "--shell-sidebar-bg": "#1e1e1e",
  "--shell-content-bg": "#1a1a1a",
  "--card-bg": "#242424",
  "--card-border": "#333333",
  "--badge-info-bg": "#1e2a3a",
  "--badge-danger-bg": "#3a1e1e",
  "--summary-strip-bg": "#242424",
  "--dialog-overlay": "rgba(0, 0, 0, 0.6)",
};

export function getTokens(theme: ResolvedTheme): ThemeTokens {
  return theme === "dark" ? darkTokens : lightTokens;
}

/**
 * Apply theme tokens as CSS custom properties on the document root.
 */
export function applyTokensToRoot(theme: ResolvedTheme): void {
  const tokens = getTokens(theme);
  const root = document.documentElement;

  for (const [key, value] of Object.entries(tokens)) {
    root.style.setProperty(key, value);
  }

  // Also set a data attribute for CSS selectors
  root.setAttribute("data-theme", theme);
}
