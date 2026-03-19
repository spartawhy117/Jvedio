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

const FIXED_SCAN_PATH_COUNT = 3;

function normalizeScanPaths(paths: string[]): string[] {
  return Array.from({ length: FIXED_SCAN_PATH_COUNT }, (_, index) => paths[index] ?? "");
}

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
  const [scanPaths, setScanPaths] = useState<string[]>(() => normalizeScanPaths(initialScanPaths));

  // Track previous open state so we only reset the form on the
  // false → true transition, not on every parent re-render.
  const prevOpenRef = useRef(false);

  useEffect(() => {
    if (open && !prevOpenRef.current) {
      // Dialog just opened — populate with initial values
      setName(initialName);
      setScanPaths(normalizeScanPaths(initialScanPaths));
    }
    prevOpenRef.current = open;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleSubmit = () => {
    const trimmedName = name.trim();
    if (!trimmedName || !scanPaths[0]?.trim()) return;

    const normalizedPaths = scanPaths
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    onSubmit({ name: trimmedName, scanPaths: normalizedPaths });
  };

  const handleScanPathChange = (index: number, value: string) => {
    setScanPaths((current) => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
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
          <div className="dialog-field">
            <span className="dialog-label">{t("dialog.scanPathsLabel")}</span>
            {scanPaths.map((scanPath, index) => (
              <label key={index} className="dialog-scan-path-row">
                <span className="dialog-scan-path-label">
                  {t("dialog.scanPathItemLabel", { index: index + 1 })}
                </span>
                <input
                  className="dialog-input"
                  type="text"
                  value={scanPath}
                  onChange={(e) => handleScanPathChange(index, e.target.value)}
                  placeholder={t("dialog.scanPathPlaceholder", { index: index + 1 })}
                />
              </label>
            ))}
            <span className="dialog-hint">{t("dialog.scanPathsHint")}</span>
          </div>
        </div>
        <div className="dialog-footer">
          <button className="btn btn-secondary" onClick={onCancel} disabled={loading}>
            {tc("cancel")}
          </button>
          <button
            className="btn btn-primary"
            onClick={handleSubmit}
            disabled={loading || !name.trim() || !scanPaths[0]?.trim()}
          >
            {loading ? tc("loading") : t("dialog.submit")}
          </button>
        </div>
      </div>
    </div>
  );
}
