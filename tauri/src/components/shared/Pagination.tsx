/**
 * Pagination — unified pagination control.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 分页控件
 *
 * Structure: ‹ [currentPage / totalPages] › [Go]
 */

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import "./Pagination.css";

export interface PaginationProps {
  pageIndex: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  disabled?: boolean;
}

export function Pagination({
  pageIndex,
  pageSize,
  totalCount,
  onPageChange,
  disabled = false,
}: PaginationProps) {
  const { t } = useTranslation("common");
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = pageIndex + 1; // Display as 1-based
  const [editing, setEditing] = useState(false);
  const [inputValue, setInputValue] = useState(String(currentPage));

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  const handlePrev = () => {
    if (canPrev) onPageChange(pageIndex - 1);
  };

  const handleNext = () => {
    if (canNext) onPageChange(pageIndex + 1);
  };

  const handleStartEdit = () => {
    setInputValue(String(currentPage));
    setEditing(true);
  };

  const handleGo = useCallback(() => {
    const target = parseInt(inputValue, 10);
    if (!isNaN(target) && target >= 1 && target <= totalPages) {
      onPageChange(target - 1);
    }
    setEditing(false);
  }, [inputValue, totalPages, onPageChange]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleGo();
    if (e.key === "Escape") setEditing(false);
  };

  return (
    <div className="pagination-bar">
      <button
        className="btn btn-icon btn-sm"
        onClick={handlePrev}
        disabled={disabled || !canPrev}
      >
        ‹
      </button>

      {editing ? (
        <input
          className="pagination-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleGo}
          autoFocus
        />
      ) : (
        <span
          className="pagination-text clickable"
          onClick={handleStartEdit}
          title="Click to jump to page"
        >
          {currentPage} / {totalPages}
        </span>
      )}

      <button
        className="btn btn-icon btn-sm"
        onClick={handleNext}
        disabled={disabled || !canNext}
      >
        ›
      </button>

      {editing && (
        <button className="btn btn-sm btn-secondary" onClick={handleGo}>
          {t("jump", { defaultValue: "跳转" })}
        </button>
      )}
    </div>
  );
}
