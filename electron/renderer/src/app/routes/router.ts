import type { LibraryListItemDto } from "../../types/api.js";

export type AppRoute =
  | { kind: "home" }
  | { kind: "library"; libraryId: string };

export function ensureRoute(hash: string, libraries: readonly LibraryListItemDto[]): AppRoute {
  const route = parseRoute(hash);
  if (route.kind === "library" && libraries.some((library) => library.libraryId === route.libraryId)) {
    return route;
  }

  return { kind: "home" };
}

export function parseRoute(hash: string): AppRoute {
  const trimmed = hash.replace(/^#/, "");
  if (trimmed.startsWith("/libraries/")) {
    const libraryId = trimmed.substring("/libraries/".length).trim();
    if (libraryId.length > 0) {
      return { kind: "library", libraryId };
    }
  }

  return { kind: "home" };
}

export function toHash(route: AppRoute): string {
  return route.kind === "library" ? `#/libraries/${route.libraryId}` : "#/home";
}
