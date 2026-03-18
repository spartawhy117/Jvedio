/**
 * Theme mode types and constants.
 *
 * Mirrors: doc/UI/new/foundation/theme-and-appearance.md
 */

/** User-selectable theme modes */
export type ThemeMode = "light" | "dark" | "system";

/** Resolved (effective) theme after evaluating system preference */
export type ResolvedTheme = "light" | "dark";

/** Local-storage key for persisted theme mode */
export const THEME_STORAGE_KEY = "jvedio-theme-mode";

/** Default theme when nothing is persisted */
export const DEFAULT_THEME_MODE: ThemeMode = "system";

/**
 * Resolve the effective theme from a ThemeMode value.
 */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === "light" || mode === "dark") return mode;
  // system → check OS preference
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light";
}

/**
 * Read persisted theme mode from localStorage.
 */
export function loadPersistedThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === "light" || stored === "dark" || stored === "system") {
      return stored;
    }
  } catch {
    // localStorage unavailable
  }
  return DEFAULT_THEME_MODE;
}

/**
 * Persist theme mode to localStorage.
 */
export function persistThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, mode);
  } catch {
    // localStorage unavailable
  }
}
