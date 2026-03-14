# Desktop UI Shell Refactor Implementation Steps

## Step 1. Lock docs and drawings

- Goal:
  - Freeze the page specs, theme tokens, icon naming, and navigation rules before touching WPF code.
- Involved modules:
  - `plan/active/desktop-ui-shell-refactor/`
  - `doc/UI/desktop-ui-shell-refactor/`
- Risks:
  - Page responsibilities stay ambiguous and leak into implementation.
- Validation:
  - Drawings can be generated without reopening scope decisions.
- Exit condition:
  - Wireframes and mockups are reviewed and approved.

### Current refinement focus

- Before moving to implementation, continue refining the UI and matching functional documents page by page.
- Recommended order for the next documentation/design pass:
  1. shared main shell
  2. Home
  3. Favorites
  4. Library content page
  5. Actors
  6. Settings
  7. Library Editor
- For each page:
  - update the page spec first
  - redraw/export the wireframe
  - record the changed behavior in the corresponding doc

## Step 2. Land theme and icon infrastructure

- Goal:
  - Introduce the Light/Dark token model and the icon manifest pipeline expected by the future UI shell.
- Involved modules:
  - `CustomStyle`
  - theme resources
  - `Resources/Icons/`
- Risks:
  - Theme and icon resources become inconsistent across pages.
- Validation:
  - Both themes can render the same icon semantic keys.
- Exit condition:
  - Theme resources and icon lookup rules are stable and consumable from XAML.

## Step 3. Rebuild the main shell and navigation

- Goal:
  - Replace the current mixed shell with the fixed left-navigation plus right-content layout.
- Involved modules:
  - `Window_Main`
  - `VieModel_Main`
  - main navigation state model
- Risks:
  - Existing page routing, filters, or tab behaviors regress.
- Validation:
  - Home, Favorites, Actors, Library, Genre, and Series routes all open correctly.
- Exit condition:
  - The shell can switch between all first-level pages.

## Step 4. Move library management into Home

- Goal:
  - Migrate the old startup window media-library CRUD and open actions into the Home page.
- Involved modules:
  - old `WindowStartUp` library actions
  - home page library list
- Risks:
  - CRUD actions remain split across old and new entry points.
- Validation:
  - Create, rename, delete, hide/show, set cover, and open all work from Home.
- Exit condition:
  - The old startup window is no longer required for daily library management.

## Step 5. Rebuild the settings window

- Goal:
  - Convert the settings window from top tabs into a left-nav plus right-card layout.
- Involved modules:
  - `Window_Settings`
  - settings-related config binding
- Risks:
  - Existing config binding or apply/save behavior regresses.
- Validation:
  - Save, Apply, and Restore Default all keep working.
- Exit condition:
  - Settings fully match the new documented information architecture.

## Step 6. Run UI and regression validation

- Goal:
  - Verify that the new shell, settings, themes, language toggles, and icon packaging behave correctly.
- Involved modules:
  - Release build
  - affected UI manual checks
  - affected tests
- Risks:
  - Visual changes break layout, resource lookup, or build packaging.
- Validation:
  - Follow `validation.md`.
- Exit condition:
  - Release build passes and the documented UI scenarios are verified.
