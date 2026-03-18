/**
 * ConfirmDialog — universal confirmation dialog skeleton.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 通用确认对话框
 * Spec: doc/UI/new/dialogs/confirm-dialog.md
 *
 * Fixed buttons: Cancel + Confirm
 * Caller provides: title, body text, danger flag
 */

import { useTranslation } from "react-i18next";
import "./ConfirmDialog.css";

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  /** Use danger styling for confirm button */
  danger?: boolean;
  /** Disable confirm while processing */
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation("common");

  if (!open) return null;

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-card" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="dialog-close" onClick={onCancel}>
            ✕
          </button>
        </div>
        <div className="dialog-body">
          <p>{message}</p>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel}>
            {t("cancel")}
          </button>
          <button
            className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? t("loading") : t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
