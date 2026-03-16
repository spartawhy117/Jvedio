# Main Shell Spec

## Purpose

- Define the shared desktop shell used by the main window content pages.
- Keep global navigation and shell controls in one reusable specification so page-level drawings can focus on right-side content.

## Shared layout

- The main shell uses a two-column structure:
  - fixed left navigation rail
  - adaptive right content area
- The left rail should stay at a fixed width and should not stretch with window resizing.
- The right content area should expand or shrink with the window size.
- The first wireframe batch for the shell should use the Light theme direction.

## Left rail

- Top brand area:
  - app icon on the left
  - app title `Jvedio Next` on the right
  - the icon + title lockup should read as one compact brand row, similar to the Clash Verge desktop-title pattern
- Primary navigation:
  - `设置`
  - `库管理`
  - `喜欢`
  - `演员`
  - every first-level entry uses the same left-icon + right-label pattern
- Smart categories block:
  - section title: `智能分类`
  - use the same title style as the `影视库` block
  - child items:
    - `类别`
    - `系列`
  - this block is a global aggregation entry by default, not a child view of a specific library
  - `类别` and `系列` aggregate videos across all libraries first; later implementation may add a per-library filter inside the page
- Media libraries block:
  - section title: `影视库`
  - use the same title style as the `智能分类` block
  - one row per configured library
  - entering a library switches the content area into that library's scoped browsing view
- The old footer popup with two expandable options is removed.
- The shell should not show a bottom-left expandable menu for `设置` or `版本检查`.

## Settings entry rule

- The `设置` entry is rendered as the first full-width navigation button in the left rail.
- Its size, spacing, and visual weight should match the `库管理` navigation button instead of using a compact title-area action.
- Clicking the top `设置` button opens the standalone settings window directly.
- `版本检查` remains inside the settings window.
- The main shell does not expose a secondary popup for settings-related actions.

## Content-page drawing rule

- Shared-shell drawings should show the full left rail and the shell proportions.
- Content-page drawings for Library Management, Favorites, Actors, Library, Genre, and Series should focus on the right content area only.
- Content-page drawings should assume the shared shell is already present and should not redraw the entire left rail.

## Responsive rule

- The left rail width is fixed across the main content pages.
- The right content area is the only region that responds to window width changes in this phase.
