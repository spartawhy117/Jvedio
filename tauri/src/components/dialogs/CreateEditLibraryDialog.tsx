/**
 * Create / Edit Library Dialog.
 *
 * Spec: doc/UI/new/dialogs/create-edit-library-dialog.md
 *
 * Shared form structure for both create and edit operations.
 * Fields: Library name + Scan paths
 */

import { useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import "./CreateEditLibraryDialog.css";

export interface CreateEditLibraryDialogProps {
  open: boolean;
  mode: "create" | "edit";
  /** Pre-fill values for edit mode */
  initialName?: string;
  initialScanPaths?: string[];
  loading?: boolean;
  onSubmit: (data: { name: string; scanPaths: string[] }) => void;
  onCancel: () => void;
}

export function CreateEditLibraryDialog({
  open,
  mode,
  initialName = "",
  initialScanPaths = [],
  loading = false,
  onSubmit,
  onCancel,
}: CreateEditLibraryDialogProps) {
  const { t } = useTranslation("library");
  const { t: tc } = useTranslation("common");

  const [name, setName] = useState(initialName);
  const [scanPathsText, setScanPathsText] = useState(initialScanPaths.join("\n"));

  // Track previous open state so we only reset the form on the
  // false → true transition, not on every parent re-render.
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened — populate with initial values
      setName(initialName);
      setScanPathsText(initialScanPaths.join("\n"));
    }
    prevOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName) return;

    const scanPaths = scanPathsText
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    onSubmit({ name: trimmedName, scanPaths });
  };

  if (!open) return null;

  const title =
    mode === "create"
      ? t("dialog.createTitle")
      : t("dialog.editTitle");

  return (
    <div className="dialog-overlay" onClick={onCancel}>
      <div className="dialog-card dialog-library" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-header">
          <h3>{title}</h3>
          <button className="dialog-close" onClick={onCancel}>✕</button>
        </div>
        <div className="dialog-body">
          {/* Library name */}
          <label className="dialog-field">
            <span className="dialog-label">{t("dialog.nameLabel")}</span>
            <input
              className="dialog-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("dialog.namePlaceholder")}
              autoFocus
            />
          </label>

          {/* Scan paths */}
          <label className="dialog-field">
            <span className="dialog-label">{t("dialog.scanPathsLabel")}</span>
            <textarea
              className="dialog-textarea"
              value={scanPathsText}
              onChange={(e) => setScanPathsText(e.target.value)}
              placeholder={t("dialog.scanPathsPlaceholder")}
              rows={4}
            />
            <span className="dialog-hint">{t("dialog.scanPathsHint")}</span>
          </label>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {tc("cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !name.trim()}
          >
            {loading ? tc("loading") : mode === "create" ? tc("create") : tc("save")}
          </button>
        </div>
      </div>
    </div>
  );
}
