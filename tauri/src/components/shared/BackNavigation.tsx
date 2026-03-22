import { useTranslation } from "react-i18next";
import { useRouter } from "../../router";
import "./BackNavigation.css";

export interface BackNavigationProps {
  fallbackLabel?: string;
}

export function BackNavigation({ fallbackLabel }: BackNavigationProps) {
  const { t } = useTranslation("common");
  const { canGoBack, goBack } = useRouter();

  if (!canGoBack) {
    return null;
  }
  const title = fallbackLabel ? `${t("back")} ${fallbackLabel}` : t("back");

  return (
    <button
      className="back-navigation"
      onClick={goBack}
      title={title}
      type="button"
      aria-label={title}
    >
      <span className="back-navigation-arrow" aria-hidden="true">←</span>
    </button>
  );
}
