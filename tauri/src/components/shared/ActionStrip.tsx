/**
 * ActionStrip — inline action button group for single-record rows.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 行内 Action Strip
 *
 * Renders a horizontal row of action buttons following the standard order:
 *   browse → execute → edit → delete
 *
 * Each action carries a visual variant that maps to button styles.
 */

import "./ActionStrip.css";

export type ActionVariant = "browse" | "execute" | "edit" | "danger";

export interface ActionStripAction {
  /** Unique key for this action */
  key: string;
  /** Button label text */
  label: string;
  /** Visual variant — determines button styling */
  variant: ActionVariant;
  /** Click handler */
  onClick: () => void;
  /** Disable this action */
  disabled?: boolean;
  /** Optional tooltip */
  title?: string;
}

export interface ActionStripProps {
  actions: ActionStripAction[];
  /** Compact mode uses smaller buttons */
  compact?: boolean;
}

const variantClassMap: Record<ActionVariant, string> = {
  browse: "btn btn-sm btn-secondary",
  execute: "btn btn-sm btn-primary",
  edit: "btn btn-sm btn-secondary",
  danger: "btn btn-sm btn-danger",
};

export function ActionStrip({ actions, compact = false }: ActionStripProps) {
  return (
    <div className={`action-strip ${compact ? "action-strip-compact" : ""}`}>
      {actions.map((action) => (
        <button
          key={action.key}
          className={variantClassMap[action.variant]}
          onClick={action.onClick}
          disabled={action.disabled}
          title={action.title}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
