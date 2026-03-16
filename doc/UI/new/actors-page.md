# Actors Page Spec

## Purpose

- Provide a dedicated first-level page for actor aggregation and browsing.

## Layout

- This page reuses the shared main shell defined in `main-shell.md`.
- The page wireframe should focus on the right content area only.
- Page title: `影片演员` or `Actors`
- Top row:
  - search
  - sort
    - `名字`
    - `数量`
  - do not place extra actions on the top-right side of the content area in this phase
- Main content:
  - adaptive card grid
  - current page scope is all actresses found across the configured libraries
  - actor avatar size stays fixed even when the window width changes
  - card column count adapts to window width

## Behavior

- Reuse the existing `ActorList` data and interaction model.
- Keep the current actor search and favorites-related capabilities where they already exist.

## Actor card content

- Avatar
  - fixed-size thumbnail
- Name
- Video count

Do not show extra tag, favorite-state, or secondary metadata text inside the actor card in this phase.

## Notes

- This page is a content page, not a library-management page.
- It should inherit the new shell and theme styles without reworking actor business logic in this documentation phase.
