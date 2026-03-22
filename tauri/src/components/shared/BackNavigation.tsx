import { useTranslation } from "react-i18next";
import { useRouter } from "../../router";
import "./BackNavigation.css";

export interface BackNavigationProps {
  fallbackLabel?: string;
}

export function BackNavigation({ fallbackLabel }: BackNavigationProps) {
  const { t } = useTranslation("common");
  const { canGoBack, goBack, history } = useRouter();

  if (!canGoBack) {
    return null;
  }

  const targetLabel = history[history.length - 1]?.label ?? fallbackLabel ?? t("back");

  return (
    <button
      className="back-navigation"
      onClick={goBack}
      title={`${t("back")} ${targetLabel}`}
      type="button"
    >
      <span className="back-navigation-arrow" aria-hidden="true">←</span>
      <span className="back-navigation-label">{targetLabel}</span>
    </button>
  );
}
