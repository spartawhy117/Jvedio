/**
 * PageRouter — maps current route to the corresponding page component.
 */

import { useRouter, type PageKey } from "../router";

// Page components
import { SettingsPage } from "./SettingsPage";
import { LibraryManagementPage } from "./LibraryManagementPage";
import { LibraryPage } from "./LibraryPage";
import { FavoritesPage } from "./FavoritesPage";
import { ActorsPage } from "./ActorsPage";
import { ActorDetailPage } from "./ActorDetailPage";
import { VideoDetailPage } from "./VideoDetailPage";

const PAGE_MAP: Record<PageKey, React.ComponentType> = {
  settings: SettingsPage,
  "library-management": LibraryManagementPage,
  library: LibraryPage,
  favorites: FavoritesPage,
  actors: ActorsPage,
  "actor-detail": ActorDetailPage,
  "video-detail": VideoDetailPage,
};

export function PageRouter() {
  const { currentPage } = useRouter();
  const PageComponent = PAGE_MAP[currentPage];

  if (!PageComponent) {
    return (
      <div className="page-placeholder">
        <h2>Unknown Page</h2>
        <p className="placeholder-hint">{currentPage}</p>
      </div>
    );
  }

  return <PageComponent />;
}
