/**
 * Video Context Menu — right-click menu for video cards.
 *
 * Spec: doc/UI/new/dialogs/video-context-menu.md
 *
 * Actions:
 * - View detail
 * - Play
 * - Open folder (Tauri shell)
 * - Toggle favorite
 * - Copy VID
 */

import { useEffect, useRef, useCallback } from "react";
import type { ReactNode } from "react";
import { AppIcon, type AppIconName } from "./AppIcon";
import "./VideoContextMenu.css";

export interface ContextMenuAction {
  key: string;
  label: string;
  icon?: AppIconName | ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export interface VideoContextMenuProps {
  x: number;
  y: number;
  actions: ContextMenuAction[];
  onClose: () => void;
}

export function VideoContextMenu({ x, y, actions, onClose }: VideoContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  // Adjust position to stay within viewport
  useEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    if (rect.right > viewportW) {
      menuRef.current.style.left = `${x - rect.width}px`;
    }
    if (rect.bottom > viewportH) {
      menuRef.current.style.top = `${y - rect.height}px`;
    }
  }, [x, y]);

  const handleAction = useCallback((action: ContextMenuAction) => {
    if (action.disabled) return;
    action.onClick();
    onClose();
  }, [onClose]);

  return (
    <div
      ref={menuRef}
      className="video-context-menu"
      style={{ left: x, top: y }}
    >
      {actions.map((action) => (
        <button
          key={action.key}
          className={`context-menu-item ${action.danger ? "danger" : ""} ${action.disabled ? "disabled" : ""}`}
          onClick={() => handleAction(action)}
          disabled={action.disabled}
        >
          {action.icon && (
            <span className="context-menu-icon">
              {typeof action.icon === "string"
                ? <AppIcon name={action.icon as AppIconName} size={15} />
                : action.icon}
            </span>
          )}
          <span className="context-menu-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
}
