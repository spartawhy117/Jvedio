# Library Page Spec

## Purpose

- Show the contents of the selected media library.

## Layout

- The normal library content page reuses the shared main shell defined in `main-shell.md`.
- The library content-page wireframe should focus on the right content area only.
- Page title uses the selected library name.
- Top action row:
  - sort
    - `VID`
    - `名称`
    - `发布时间`
- Main content:
  - video card grid similar to the Favorites page rhythm
  - the default first-page density should show about 50 videos
  - paging controls should sit in the bottom-right corner of the content area
  - no extra top-right shell actions in this phase

## Current content-page rules

- This page should feel close to the Favorites page layout direction, but for the currently selected media library.
- The current content-page wireframe should focus on:
  - library title
  - `VID / 名称 / 发布时间` sorting
  - video grid density
  - bottom-right paging
- The first content-page wireframe in this phase does not need to show a dedicated search box.

## Library settings page

- The Library Management page `Editor` action opens a dedicated library-settings page instead of editing inline.
- The library-settings page should follow the same compact visual direction as the settings window:
  - dense spacing
  - low-noise shell
  - narrow left navigation plus right content list
  - one compact list for the active nav item content
- The page should use the same left-side navigation selection pattern as the settings window instead of a horizontal tab strip.
- In the current phase, only one left-nav item is needed:
  - `扫描路径`
- The active tab content only needs one editable setting item:
  - the folder path used as the scan path for this library
- Do not add extra rows for scan strategy, scraper rules, or other advanced options in this round.
- Scan and scraping behavior are treated as automatic defaults in this phase and do not need dedicated controls on this page.
- This page is separate from the normal library browsing page.

## Behavior

- Selecting a library from the left navigation opens this page.
- This page is scoped to the selected library only, unlike the global `类别` / `系列` aggregation entries in the shared shell.
- Existing browsing, filtering, search, and detail-opening behavior should be preserved in the later implementation phase.
- Opening the library editor from Library Management lands directly on the `扫描路径` item.
- The first content-page wireframe should show the selected-library browsing view rather than the editor view.

## Notes

- This page is distinct from Library Management.
- Library Management manages libraries.
- Library Page browses a selected library's contents.
- The first wireframe for the editor page should emphasize the compact left-nav shell and the single scan-path configuration row, not feature breadth.
- The first wireframe for the library content page should emphasize the Favorites-like browsing layout, the three sort options, and the 50-item default paging rhythm.
- The current exported wireframe batch should use the Light theme direction first.
