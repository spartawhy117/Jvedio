/**
 * QueryToolbar — shared query/sort/refresh toolbar for result pages.
 *
 * Spec: doc/UI/new/shared/shared-components.md → 结果页查询工具栏
 */

import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import "./QueryToolbar.css";

export interface QueryToolbarProps {
  keyword?: string;
  onSearch?: (keyword: string) => void;
  onRefresh?: () => void;
  sortOptions?: { value: string; label: string }[];
  currentSort?: string;
  onSortChange?: (value: string) => void;
  disabled?: boolean;
}

export function QueryToolbar({
  keyword = "",
  onSearch,
  onRefresh,
  sortOptions = [],
  currentSort,
  onSortChange,
  disabled = false,
}: QueryToolbarProps) {
  const { t } = useTranslation("common");
  const [localKeyword, setLocalKeyword] = useState(keyword);
  const [sortOpen, setSortOpen] = useState(false);

  useEffect(() => {
    setLocalKeyword(keyword);
  }, [keyword]);

  useEffect(() => {
    if (!onSearch || localKeyword === keyword) {
      return;
    }

    const timer = window.setTimeout(() => {
      onSearch(localKeyword);
    }, 250);

    return () => {
      window.clearTimeout(timer);
    };
  }, [keyword, localKeyword, onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && onSearch) {
        onSearch(localKeyword);
      }
    },
    [localKeyword, onSearch]
  );

  const handleSortSelect = (value: string) => {
    onSortChange?.(value);
    setSortOpen(false);
  };

  return (
    <div className="query-toolbar">
      <input
        className="search-input"
        type="text"
        placeholder={t("searchPlaceholder")}
        value={localKeyword}
        onChange={(e) => setLocalKeyword(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />
      <button
        className="btn btn-icon"
        onClick={onRefresh}
        disabled={disabled}
        title={t("refresh")}
      >
        ↻
      </button>
      <div className="toolbar-spacer" />

      {sortOptions.length > 0 && (
        <div className="sort-dropdown-wrapper">
          <button
            className="btn btn-secondary btn-sm"
            onClick={() => setSortOpen(!sortOpen)}
            disabled={disabled}
          >
            {t("sortBy")} ▾
          </button>
          {sortOpen && (
            <div className="sort-dropdown">
              {sortOptions.map((opt) => (
                <button
                  key={opt.value}
                  className={`sort-option ${currentSort === opt.value ? "active" : ""}`}
                  onClick={() => handleSortSelect(opt.value)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
