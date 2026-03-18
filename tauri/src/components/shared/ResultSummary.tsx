/**
 * ResultSummary — unified result summary bar for aggregate pages.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 结果摘要条
 *
 * Displays total count + optional secondary stats in a compact inline bar.
 */

import { useTranslation } from "react-i18next";
import "./ResultSummary.css";

export interface ResultSummaryProps {
  /** Total result count */
  totalCount: number;
  /** Optional secondary stat items (e.g. missing resources count, current filter) */
  secondaryItems?: { label: string; value: string | number }[];
  /** When true, hide the component */
  hidden?: boolean;
}

export function ResultSummary({
  totalCount,
  secondaryItems,
  hidden = false,
}: ResultSummaryProps) {
  const { t } = useTranslation("common");

  if (hidden) return null;

  return (
    <div className="result-summary">
      <span className="result-summary-total">
        {t("totalCount", { count: totalCount })}
      </span>
      {secondaryItems &&
        secondaryItems.map((item, i) => (
          <span key={i} className="result-summary-item">
            <span className="result-summary-item-label">{item.label}</span>
            <span className="result-summary-item-value">{item.value}</span>
          </span>
        ))}
    </div>
  );
}
