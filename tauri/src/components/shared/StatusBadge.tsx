/**
 * StatusBadge — unified short-word status indicator.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 状态 Badge
 *
 * Color semantics:
 *   green  → pending / actionable
 *   blue   → running / in-progress
 *   gray   → synced / stable
 *   red    → failed / risk
 *
 * Also supports a "dot" display mode for compact status indicators.
 */

import "./StatusBadge.css";

export type BadgeVariant = "pending" | "running" | "synced" | "failed";
export type BadgeDisplay = "label" | "dot";

export interface StatusBadgeProps {
  /** Status variant — determines color */
  variant: BadgeVariant;
  /** Display mode: "label" (pill with text) or "dot" (small circle only) */
  display?: BadgeDisplay;
  /** Badge text — required for "label" display, optional tooltip for "dot" */
  label?: string;
  /** Custom title/tooltip */
  title?: string;
  /** Additional CSS class */
  className?: string;
}

export function StatusBadge({
  variant,
  display = "label",
  label,
  title,
  className = "",
}: StatusBadgeProps) {
  if (display === "dot") {
    return (
      <span
        className={`status-badge-dot status-badge-dot--${variant} ${className}`}
        title={title ?? label}
      />
    );
  }

  return (
    <span
      className={`status-badge-label status-badge-label--${variant} ${className}`}
      title={title}
    >
      {label}
    </span>
  );
}
