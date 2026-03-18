import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  type ThemeMode,
  type ResolvedTheme,
  resolveTheme,
  loadPersistedThemeMode,
  persistThemeMode,
} from "./theme-mode-store";
import { applyTokensToRoot } from "./theme-tokens";

// ── Context types ───────────────────────────────────────

interface ThemeContextValue {
  /** User-selected mode: "light" | "dark" | "system" */
  themeMode: ThemeMode;
  /** Resolved (effective) theme: "light" | "dark" */
  resolvedTheme: ResolvedTheme;
  /** Change the theme mode */
  setThemeMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  themeMode: "system",
  resolvedTheme: "light",
  setThemeMode: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

// ── Provider ────────────────────────────────────────────

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [themeMode, setThemeModeState] = useState<ThemeMode>(() =>
    loadPersistedThemeMode()
  );
  const [resolvedTheme, setResolvedTheme] = useState<ResolvedTheme>(() =>
    resolveTheme(loadPersistedThemeMode())
  );

  // Apply tokens whenever resolved theme changes
  useEffect(() => {
    applyTokensToRoot(resolvedTheme);
  }, [resolvedTheme]);

  // Listen for system preference changes when mode === "system"
  useEffect(() => {
    if (themeMode !== "system") return;

    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => {
      setResolvedTheme(e.matches ? "dark" : "light");
    };
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [themeMode]);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    persistThemeMode(mode);
    setResolvedTheme(resolveTheme(mode));
  }, []);

  return (
    <ThemeContext.Provider value={{ themeMode, resolvedTheme, setThemeMode }}>
      {children}
    </ThemeContext.Provider>
  );
}
