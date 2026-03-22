import { useTranslation } from "react-i18next";
import { useRouter } from "../../router";
import "./BackNavigation.css";

export interface BackNavigationProps {
  fallbackLabel?: string;
}

export function BackNavigation({ fallbackLabel }: BackNavigationProps) {
  const { t } = useTranslation("common");
  const { t: tn } = useTranslation("navigation");
  const { t: tl } = useTranslation("library");
  const { canGoBack, goBack, history } = useRouter();

  if (!canGoBack) {
    return null;
  }

  const target = history[history.length - 1];
  const explicitLabel = target?.label?.trim();
  const routeLabel = (() => {
    switch (target?.page) {
      case "library-management":
        return tl("management.title");
      case "library":
        return tl("page.title");
      case "favorites":
        return tn("favorites");
      case "actors":
      case "actor-detail":
        return tn("actors");
      case "video-detail":
        return t("videoDetail");
      case "settings":
        return tn("settings");
      default:
        return undefined;
    }
  })();
  const targetLabel = explicitLabel || routeLabel || fallbackLabel || t("back");

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
