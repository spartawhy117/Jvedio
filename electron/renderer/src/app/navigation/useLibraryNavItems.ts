import type { LibraryListItemDto } from "../../types/api";
import type { AppRoute } from "../routes/router";

export interface NavigationItem {
  active: boolean;
  badge?: string;
  href: string;
  label: string;
}

export function useLibraryNavItems(
  libraries: readonly LibraryListItemDto[],
  route: AppRoute,
): readonly NavigationItem[] {
  return libraries.map((library) => ({
    active: route.kind === "library" && route.libraryId === library.libraryId,
    badge: library.videoCount > 0 ? String(library.videoCount) : undefined,
    href: `#/libraries/${library.libraryId}`,
    label: library.name,
  }));
}
