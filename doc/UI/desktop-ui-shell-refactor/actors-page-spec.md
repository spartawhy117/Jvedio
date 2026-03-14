# Actors Page Spec

## Purpose

- Provide a dedicated first-level page for actor aggregation and browsing.

## Layout

- Page title: `影片演员` or `Actors`
- Top row:
  - search
  - sort
  - view mode switch when available
- Main content:
  - actor list or card grid, depending on the chosen actor view mode

## Behavior

- Reuse the existing `ActorList` data and interaction model.
- Keep the current actor search and favorites-related capabilities where they already exist.

## Notes

- This page is a content page, not a library-management page.
- It should inherit the new shell and theme styles without reworking actor business logic in this documentation phase.
