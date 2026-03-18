/**
 * ResultState — unified Loading / Empty / Error state component.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 结果状态组件
 */

import { useTranslation } from "react-i18next";
import "./ResultState.css";

export type ResultStateType = "loading" | "empty" | "error";

export interface ResultStateProps {
  type: ResultStateType;
  icon?: string;
  message?: string;
  hint?: string;
}

export function ResultState({ type, icon, message, hint }: ResultStateProps) {
  const { t } = useTranslation("common");

  const defaults: Record<ResultStateType, { icon: string; message: string }> = {
    loading: { icon: "⏳", message: t("loading") },
    empty: { icon: "📭", message: t("noResults") },
    error: { icon: "⚠", message: t("error") },
  };

  const d = defaults[type];

  return (
    <div className={`result-state result-state-${type}`}>
      {type === "loading" ? (
        <div className="result-state-spinner" />
      ) : (
        <span className="result-state-icon">{icon ?? d.icon}</span>
      )}
      <p className="result-state-message">{message ?? d.message}</p>
      {hint && <p className="result-state-hint">{hint}</p>}
    </div>
  );
}
