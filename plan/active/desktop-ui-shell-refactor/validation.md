# Desktop UI Shell Refactor Validation Matrix

## Documentation phase

- Confirm `plan/active/desktop-ui-shell-refactor/` is the only active feature directory.
- Confirm `doc/UI/desktop-ui-shell-refactor/` includes:
  - `README.md`
  - `references.md`
  - `information-architecture.md`
  - page spec docs
  - `theme-spec.md`
  - `icon-config-spec.md`
  - `drawing-output-guide.md`
- Confirm `doc/UI/old/` remains unchanged as the baseline screenshot set.

## Drawing phase

- Shared shell wireframe matches the documented fixed-width left rail, adaptive right content area, `智能分类`, and title-area settings entry.
- Home page wireframe matches the documented media-library management list layout.
- Favorites page wireframe matches the documented no-search, sorting, and bottom-right paging rules.
- Actors page wireframe matches the documented search, sorting, fixed avatar size, and card-content rules.
- Library content page wireframe matches the documented `VID / 名称 / 发布时间` sorting and 50-item paging rhythm.
- Settings page wireframe matches the documented standalone window and left-navigation layout.
- Both Light and Dark mockups use the documented token rules.
- Navigation icons and action icons align with the semantic keys in `icon-config-spec.md`.
- The navigation and icon semantic diagram is exported with the documented first-batch naming rules.

## Implementation phase

### Startup and shell

- App opens directly into the main shell home page.
- No daily workflow depends on the old startup window.
- Empty-library state renders correctly.

### Home page library management

- Create library works.
- Rename library works.
- Delete library works.
- Hide/show library works.
- Set library cover works.
- Open selected library works.

### Main pages

- Home page renders the library management list and top actions.
- Favorites page renders favorites correctly.
- Actors page renders actor aggregation correctly.
- Library page opens the selected library content.
- Genre and Series pages open correctly from the left navigation.

### Settings

- Settings opens from the shared shell title-area `设置` entry.
- Language selector exposes only `中文` and `English`.
- Theme selector exposes only `Light` and `Dark`.
- Save, Apply, and Restore Default all work.

### Theme and icon packaging

- Light theme renders correctly.
- Dark theme renders correctly.
- All semantic icons resolve and display.
- Build output contains the required icon resources.

## Build validation

- Release build succeeds after documentation and later implementation changes.
- No resource-path or project-file regression is introduced by icon or theme asset additions.
