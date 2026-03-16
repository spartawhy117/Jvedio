# Home Page Spec

## Purpose

- The Home page is the media-library management page.
- It replaces the old startup window as the daily place to view and manage libraries.

## Layout

- This page reuses the shared main shell defined in `main-shell.md`.
- The page wireframe should focus on the right content area only.
- Page title: `首页` or `Home`
- Top action row:
  - `新建媒体库`
  - `导入 / 恢复`
- Main content:
  - flat list or low-elevation card list
  - one row per media library
  - the first drawing batch should treat this as a list-first page, not a gallery page

## Library list fields

- Library name
- Media type
- Item count
- Created time or last updated time

## Row interaction rules

- Row primary action:
  - open the selected library
- Row secondary actions:
  - place them at the trailing side as compact buttons or an overflow menu
## Per-library actions

- Scan
  - triggers an incremental change scan for that library
  - button text changes to the current progress percentage while scanning
  - when the scan completes, the button returns to `100%`
- Editor
  - opens a separate library-settings page
- Open library
- Rename library
- Delete library

These actions should migrate from the current startup-window logic instead of being redesigned from scratch.

## Library settings entry

- `Editor` is placed before the other row actions in each library row.
- Clicking `Editor` opens a dedicated library-settings page.
- The first version of that settings page should use the same compact left-side navigation pattern as the settings window.
- In the current phase, the editor page only needs the `扫描路径` nav item and its path-setting row.
- Scan and scraping rules remain automatic defaults for now and are not exposed as editable controls on the editor page.

## Scan behavior

- Each library row exposes its own `扫描` button.
- The scan performs incremental change detection instead of a full rebuild.
- During scanning, the button text should show progress such as `42%`.
- After completion, the button returns to `扫描`.
- Every time the user enters the Home page, the app should quickly check whether each library has file additions or removals.
- If a library has detected changes, show the `扫描` button in green to indicate pending incremental updates.
- If no file changes are detected, show the `扫描` button in red to indicate no new changes.
- Use color only for this ready-state distinction in this phase.

## Empty state

- Show a simple empty state when no library exists.
- Primary action: `新建媒体库`
- Secondary action: `导入 / 恢复`
- Text should explain that the app starts from library management now.

## Notes

- Do not use the visual poster-collage library card style as the primary home representation.
- Library management clarity is more important than visual variety on this page.
- The page should not duplicate global shell actions.
- The global settings entry now lives in the shared shell title area instead of a footer popup or a page-level top-right shell area.
- Do not design hidden/show-hidden library flows in this phase.
- Do not design cover-thumbnail management in this phase.
