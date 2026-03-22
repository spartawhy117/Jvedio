/**
 * ResultState — unified Loading / Empty / Error state component.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 结果状态组件
 */

import { useTranslation } from "react-i18next";
import type { ReactNode } from "react";
import { AppIcon } from "./AppIcon";
import "./ResultState.css";

export type ResultStateType = "loading" | "empty" | "error";

export interface ResultStateProps {
  type: ResultStateType;
  icon?: ReactNode;
  message?: string;
  hint?: string;
}

export function ResultState({ type, icon, message, hint }: ResultStateProps) {
  const { t } = useTranslation("common");

  const defaults: Record<ResultStateType, { icon: ReactNode; message: string }> = {
    loading: { icon: <AppIcon name="running" size={36} />, message: t("loading") },
    empty: { icon: <AppIcon name="library" size={36} />, message: t("noResults") },
    error: { icon: <AppIcon name="failed" size={36} />, message: t("error") },
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
