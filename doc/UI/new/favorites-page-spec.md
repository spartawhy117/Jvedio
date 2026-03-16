# Favorites Page Spec

## Purpose

- Provide a dedicated first-level page for favorite videos.

## Layout

- This page reuses the shared main shell defined in `main-shell-spec.md`.
- The page wireframe should focus on the right content area only.
- Page title: `收藏` or `Favorites`
- Top row:
  - sort
    - `名字`
    - `发布日期`
  - do not place extra actions on the top-right side of the content area in this phase
- Main content:
  - video card grid
  - on a 1080p window, the default first-page density should show about 30 videos
  - paging controls should sit in the bottom-right corner of the content area

## Behavior

- Reuse the existing favorites data logic.
- This page does not provide a search entry in this phase.
- Keep sort and paging behavior aligned with the current video list experience.

## Empty state

- If there are no favorites, show a lightweight empty state.
- No library CRUD actions belong here.
