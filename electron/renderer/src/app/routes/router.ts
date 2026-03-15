import type { LibraryListItemDto } from "../../types/api.js";

export interface LibraryVideoRouteQuery {
  keyword: string;
  missingSidecarOnly: boolean;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface ActorsRouteQuery {
  keyword: string;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export type SettingsRouteGroup = "basic" | "picture" | "scanImport" | "network" | "library" | "metaTube";

export type AppRoute =
  | { kind: "home" }
  | { kind: "favorites"; query: LibraryVideoRouteQuery }
  | { kind: "actors"; query: ActorsRouteQuery }
  | { kind: "actor"; actorId: string; query: ActorsRouteQuery }
  | { kind: "library"; libraryId: string; query: LibraryVideoRouteQuery }
  | { kind: "settings"; group: SettingsRouteGroup }
  | { kind: "video"; backTo: string | null; videoId: string };

export function ensureRoute(hash: string, libraries: readonly LibraryListItemDto[]): AppRoute {
  const route = parseRoute(hash);
  if (route.kind === "library" && libraries.some((library) => library.libraryId === route.libraryId)) {
    return route;
  }

  if (route.kind === "video") {
    return route;
  }

  if (route.kind === "favorites") {
    return route;
  }

  if (route.kind === "actor") {
    return route;
  }

  if (route.kind === "actors") {
    return route;
  }

  if (route.kind === "settings") {
    return route;
  }

  return { kind: "home" };
}

export function parseRoute(hash: string): AppRoute {
  const trimmed = hash.replace(/^#/, "");
  const [routePath, queryText = ""] = trimmed.split("?");

  if (routePath.startsWith("/libraries/")) {
    const libraryId = routePath.substring("/libraries/".length).trim();
    if (libraryId.length > 0) {
      return {
        kind: "library",
        libraryId,
        query: parseLibraryVideoRouteQuery(queryText),
      };
    }
  }

  if (routePath === "/favorites" || routePath === "/favorites/") {
    return {
      kind: "favorites",
      query: parseLibraryVideoRouteQuery(queryText),
    };
  }

  if (routePath === "/actors" || routePath === "/actors/") {
    const actorId = parseLegacyActorId(queryText);
    const query = parseActorsRouteQuery(queryText);
    if (actorId) {
      return {
        kind: "actor",
        actorId,
        query,
      };
    }

    return {
      kind: "actors",
      query,
    };
  }

  if (routePath.startsWith("/actors/")) {
    const actorId = decodeURIComponent(routePath.substring("/actors/".length).replace(/\/$/, "").trim());
    if (actorId.length > 0) {
      return {
        kind: "actor",
        actorId,
        query: parseActorsRouteQuery(queryText),
      };
    }
  }

  if (routePath.startsWith("/videos/")) {
    const videoId = routePath.substring("/videos/".length).trim();
    if (videoId.length > 0) {
      return {
        kind: "video",
        backTo: parseVideoBackTo(queryText),
        videoId,
      };
    }
  }

  if (routePath === "/settings" || routePath === "/settings/") {
    return {
      kind: "settings",
      group: parseSettingsGroup(new URLSearchParams(queryText).get("group")),
    };
  }

  return { kind: "home" };
}

export function toHash(route: AppRoute): string {
  if (route.kind === "favorites") {
    const queryString = buildLibraryVideoRouteQuery(route.query);
    return queryString.length > 0
      ? `#/favorites?${queryString}`
      : "#/favorites";
  }

  if (route.kind === "actors") {
    const queryString = buildActorsRouteQuery(route.query);
    return queryString.length > 0
      ? `#/actors?${queryString}`
      : "#/actors";
  }

  if (route.kind === "actor") {
    const queryString = buildActorsRouteQuery(route.query);
    return queryString.length > 0
      ? `#/actors/${encodeURIComponent(route.actorId)}?${queryString}`
      : `#/actors/${encodeURIComponent(route.actorId)}`;
  }

  if (route.kind === "library") {
    const queryString = buildLibraryVideoRouteQuery(route.query);
    return queryString.length > 0
      ? `#/libraries/${route.libraryId}?${queryString}`
      : `#/libraries/${route.libraryId}`;
  }

  if (route.kind === "video") {
    const searchParams = new URLSearchParams();
    if (route.backTo && route.backTo.trim().length > 0) {
      searchParams.set("backTo", route.backTo.trim());
    }

    const queryString = searchParams.toString();
    return queryString.length > 0
      ? `#/videos/${route.videoId}?${queryString}`
      : `#/videos/${route.videoId}`;
  }

  if (route.kind === "settings") {
    return route.group === "basic"
      ? "#/settings"
      : `#/settings?group=${encodeURIComponent(route.group)}`;
  }

  return "#/home";
}

export function createDefaultLibraryVideoRouteQuery(): LibraryVideoRouteQuery {
  return {
    keyword: "",
    missingSidecarOnly: false,
    pageIndex: 0,
    pageSize: 60,
    sortBy: "lastScanDate",
    sortOrder: "desc",
  };
}

export function createDefaultActorsRouteQuery(): ActorsRouteQuery {
  return {
    keyword: "",
    pageIndex: 0,
    pageSize: 60,
    sortBy: "name",
    sortOrder: "asc",
  };
}

function parseLibraryVideoRouteQuery(queryText: string): LibraryVideoRouteQuery {
  const defaults = createDefaultLibraryVideoRouteQuery();
  const searchParams = new URLSearchParams(queryText);
  const pageIndex = Number.parseInt(searchParams.get("pageIndex") ?? "", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);
  const sortOrder = searchParams.get("sortOrder") === "asc" ? "asc" : defaults.sortOrder;

  return {
    keyword: searchParams.get("keyword")?.trim() ?? defaults.keyword,
    missingSidecarOnly: searchParams.get("missingSidecarOnly") === "true",
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : defaults.pageIndex,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaults.pageSize,
    sortBy: searchParams.get("sortBy")?.trim() || defaults.sortBy,
    sortOrder,
  };
}

function buildLibraryVideoRouteQuery(query: LibraryVideoRouteQuery): string {
  const defaults = createDefaultLibraryVideoRouteQuery();
  const searchParams = new URLSearchParams();

  if (query.keyword.trim().length > 0) {
    searchParams.set("keyword", query.keyword.trim());
  }
  if (query.sortBy !== defaults.sortBy) {
    searchParams.set("sortBy", query.sortBy);
  }
  if (query.sortOrder !== defaults.sortOrder) {
    searchParams.set("sortOrder", query.sortOrder);
  }
  if (query.pageIndex !== defaults.pageIndex) {
    searchParams.set("pageIndex", String(query.pageIndex));
  }
  if (query.pageSize !== defaults.pageSize) {
    searchParams.set("pageSize", String(query.pageSize));
  }
  if (query.missingSidecarOnly) {
    searchParams.set("missingSidecarOnly", "true");
  }

  return searchParams.toString();
}

function parseActorsRouteQuery(queryText: string): ActorsRouteQuery {
  const defaults = createDefaultActorsRouteQuery();
  const searchParams = new URLSearchParams(queryText);
  const pageIndex = Number.parseInt(searchParams.get("pageIndex") ?? "", 10);
  const pageSize = Number.parseInt(searchParams.get("pageSize") ?? "", 10);
  const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : defaults.sortOrder;

  return {
    keyword: searchParams.get("keyword")?.trim() ?? defaults.keyword,
    pageIndex: Number.isFinite(pageIndex) && pageIndex >= 0 ? pageIndex : defaults.pageIndex,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? pageSize : defaults.pageSize,
    sortBy: searchParams.get("sortBy")?.trim() || defaults.sortBy,
    sortOrder,
  };
}

function buildActorsRouteQuery(query: ActorsRouteQuery): string {
  const defaults = createDefaultActorsRouteQuery();
  const searchParams = new URLSearchParams();

  if (query.keyword.trim().length > 0) {
    searchParams.set("keyword", query.keyword.trim());
  }
  if (query.sortBy !== defaults.sortBy) {
    searchParams.set("sortBy", query.sortBy);
  }
  if (query.sortOrder !== defaults.sortOrder) {
    searchParams.set("sortOrder", query.sortOrder);
  }
  if (query.pageIndex !== defaults.pageIndex) {
    searchParams.set("pageIndex", String(query.pageIndex));
  }
  if (query.pageSize !== defaults.pageSize) {
    searchParams.set("pageSize", String(query.pageSize));
  }

  return searchParams.toString();
}

function parseSettingsGroup(value: string | null): SettingsRouteGroup {
  if (value === "picture" || value === "scanImport" || value === "network" || value === "library" || value === "metaTube") {
    return value;
  }

  return "basic";
}

function parseLegacyActorId(queryText: string): string {
  return new URLSearchParams(queryText).get("actorId")?.trim() ?? "";
}

function parseVideoBackTo(queryText: string): string | null {
  const value = new URLSearchParams(queryText).get("backTo")?.trim() ?? "";
  if (!value) {
    return null;
  }

  return value.startsWith("#") ? value : `#${value}`;
}
