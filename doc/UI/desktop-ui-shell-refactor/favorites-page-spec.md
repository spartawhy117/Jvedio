# Favorites Page Spec

## Purpose

- Provide a dedicated first-level page for favorite videos.

## Layout

- Page title: `收藏` or `Favorites`
- Top row:
  - search
  - sort
  - view mode toggle
- Main content:
  - video card grid or list depending on the active view mode

## Behavior

- Reuse the existing favorites data logic.
- Keep search, sort, and paging behavior aligned with the current video list experience.

## Empty state

- If there are no favorites, show a lightweight empty state.
- No library CRUD actions belong here.
