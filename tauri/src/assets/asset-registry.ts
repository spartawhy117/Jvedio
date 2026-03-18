/**
 * Asset registry skeleton.
 *
 * Mirrors: doc/UI/new/foundation/assets-icons-and-coloring.md
 *
 * This file provides a lightweight registry for theme-aware static assets
 * (illustrations, brand images). Regular operation icons should use an
 * icon library (e.g., Material Symbols) via component imports.
 *
 * Directory conventions:
 *  - src/assets/image/brand/     → App logo, brand marks
 *  - src/assets/image/itemicon/  → Navigation / page-specific business icons
 *  - src/assets/image/component/ → Component-level custom SVGs
 *  - src/assets/image/illustration/ → Empty states, onboarding illustrations
 *  - src-tauri/icons/            → Desktop shell icons (installer, tray, etc.)
 *
 * Business media images (poster, thumb, fanart, actor avatars) are NOT
 * registered here — they come from Worker API responses.
 */

export type AssetKind = "brand" | "icon" | "illustration" | "component";

export interface AssetEntry {
  /** Unique identifier */
  id: string;
  /** Asset category */
  kind: AssetKind;
  /** Whether this asset has theme variants */
  themeAware: boolean;
  /** Light mode source path (or only source if not theme-aware) */
  lightSrc: string;
  /** Dark mode source path (only used if themeAware) */
  darkSrc?: string;
  /** Whether the SVG uses currentColor for tinting */
  tintable: boolean;
  /** Optional source attribution for third-party assets */
  source?: string;
}

/**
 * Registered assets. Add entries as assets are created/imported.
 */
export const assetRegistry: AssetEntry[] = [
  // Example entries (uncomment / add as assets are created):
  //
  // {
  //   id: "app-logo",
  //   kind: "brand",
  //   themeAware: false,
  //   lightSrc: "/assets/image/brand/app-logo.svg",
  //   tintable: false,
  // },
  // {
  //   id: "empty-library",
  //   kind: "illustration",
  //   themeAware: true,
  //   lightSrc: "/assets/image/illustration/empty-library-light.svg",
  //   darkSrc: "/assets/image/illustration/empty-library-dark.svg",
  //   tintable: false,
  // },
];

/**
 * Look up an asset by ID.
 */
export function getAsset(id: string): AssetEntry | undefined {
  return assetRegistry.find((a) => a.id === id);
}

/**
 * Get the correct source path for an asset given the current theme.
 */
export function getAssetSrc(
  id: string,
  theme: "light" | "dark"
): string | undefined {
  const entry = getAsset(id);
  if (!entry) return undefined;
  if (entry.themeAware && theme === "dark" && entry.darkSrc) {
    return entry.darkSrc;
  }
  return entry.lightSrc;
}
