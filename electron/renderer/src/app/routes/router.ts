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
  actorId: string;
  keyword: string;
  pageIndex: number;
  pageSize: number;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export type SettingsRouteGroup = "general" | "metaTube" | "playback";

export type AppRoute =
  | { kind: "home" }
  | { kind: "actors"; query: ActorsRouteQuery }
  | { kind: "library"; libraryId: string; query: LibraryVideoRouteQuery }
  | { kind: "settings"; group: SettingsRouteGroup }
  | { kind: "video"; videoId: string };

export function ensureRoute(hash: string, libraries: readonly LibraryListItemDto[]): AppRoute {
  const route = parseRoute(hash);
  if (route.kind === "library" && libraries.some((library) => library.libraryId === route.libraryId)) {
    return route;
  }

  if (route.kind === "video") {
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

  if (routePath === "/actors" || routePath === "/actors/") {
    return {
      kind: "actors",
      query: parseActorsRouteQuery(queryText),
    };
  }

  if (routePath.startsWith("/videos/")) {
    const videoId = routePath.substring("/videos/".length).trim();
    if (videoId.length > 0) {
      return { kind: "video", videoId };
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
  if (route.kind === "actors") {
    const queryString = buildActorsRouteQuery(route.query);
    return queryString.length > 0
      ? `#/actors?${queryString}`
      : "#/actors";
  }

  if (route.kind === "library") {
    const queryString = buildLibraryVideoRouteQuery(route.query);
    return queryString.length > 0
      ? `#/libraries/${route.libraryId}?${queryString}`
      : `#/libraries/${route.libraryId}`;
  }

  if (route.kind === "video") {
    return `#/videos/${route.videoId}`;
  }

  if (route.kind === "settings") {
    return route.group === "general"
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
    actorId: "",
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
    actorId: searchParams.get("actorId")?.trim() ?? defaults.actorId,
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
  if (query.actorId.trim().length > 0) {
    searchParams.set("actorId", query.actorId.trim());
  }

  return searchParams.toString();
}

function parseSettingsGroup(value: string | null): SettingsRouteGroup {
  return value === "metaTube" || value === "playback" ? value : "general";
}
