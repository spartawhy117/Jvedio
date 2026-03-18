/**
 * i18n initialization.
 *
 * Mirrors: doc/UI/new/foundation/localization.md
 *
 * Initialization order:
 *  1. localStorage persisted language
 *  2. Browser/system language
 *  3. Fallback: zh
 */

import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import zh from "./zh";
import en from "./en";

const LANG_STORAGE_KEY = "jvedio-language";

function detectLanguage(): string {
  // 1. Persisted
  try {
    const stored = localStorage.getItem(LANG_STORAGE_KEY);
    if (stored === "zh" || stored === "en") return stored;
  } catch {
    // ignore
  }

  // 2. Browser language
  const browserLang = navigator.language?.toLowerCase() || "";
  if (browserLang.startsWith("zh")) return "zh";
  if (browserLang.startsWith("en")) return "en";

  // 3. Fallback
  return "zh";
}

i18n.use(initReactI18next).init({
  resources: {
    zh: zh,
    en: en,
  },
  lng: detectLanguage(),
  fallbackLng: "zh",
  defaultNS: "common",
  interpolation: {
    escapeValue: false, // React already escapes
  },
});

/**
 * Change the active language and persist the choice.
 */
export function changeLanguage(lang: "zh" | "en"): void {
  i18n.changeLanguage(lang);
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    // ignore
  }
}

export default i18n;
