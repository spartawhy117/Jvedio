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
  - app icon
  - app title `Jvedio`
  - `设置` button placed on the right side of the app title area, next to the title/icon block
- Primary navigation:
  - Home
  - Favorites
  - Actors
- Smart categories block:
  - section title: `智能分类`
  - child items:
    - `类别`
    - `系列`
- Media libraries block:
  - one row per configured library
- The old footer popup with two expandable options is removed.
- The shell should not show a bottom-left expandable menu for `设置` or `版本检查`.

## Settings entry rule

- Clicking the `设置` button in the top brand area opens the standalone settings window directly.
- `版本检查` remains inside the settings window.
- The main shell does not expose a secondary popup for settings-related actions.

## Content-page drawing rule

- Shared-shell drawings should show the full left rail and the shell proportions.
- Content-page drawings for Home, Favorites, Actors, Library, Genre, and Series should focus on the right content area only.
- Content-page drawings should assume the shared shell is already present and should not redraw the entire left rail.

## Responsive rule

- The left rail width is fixed across the main content pages.
- The right content area is the only region that responds to window width changes in this phase.
