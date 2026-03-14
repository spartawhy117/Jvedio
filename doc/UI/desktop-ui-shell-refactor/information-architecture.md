# Information Architecture

## Main window

- Left navigation rail
  - fixed order from top to bottom
  - fixed width
  - does not stretch with window resizing
  - top brand area
    - app icon
    - app title `Jvedio`
    - `设置` button placed on the right side of the title area
  - Home
  - Favorites
  - Actors
  - 智能分类
    - 类别
    - 系列
  - Media Libraries
    - one entry per configured library
  - Settings is not a permanent first-level destination in the main rail
- Right content area
  - adaptive width
  - Home page
  - Favorites page
  - Actors page
  - Library page
  - Genre page
  - Series page

## Top-right shell actions

- No persistent top-right search, sort, or settings entry in this refactor batch.
- Page-level tools may still exist inside content pages when those tools belong to the page itself.

## Page routing rules

- App start:
  - open the main window directly
  - land on Home
  - highlight Home in the left rail
- Selecting a library in the left rail:
  - opens the library page for that library
  - keeps the library item highlighted until another first-level destination is selected
- Selecting Genre or Series:
  - opens the corresponding aggregate content page
- Opening settings from the rail footer button:
- Opening settings from the title-area `设置` button:
  - does not replace the main page
  - opens a separate settings window
  - does not show an intermediate popup with `设置` / `版本检查`
- Version check:
  - lives inside the settings window
  - is not a separate shell popup entry in this phase
  - only supports manual version checks in this phase

## Page responsibilities

- Home
  - media-library management only
- Favorites
  - favorite video aggregation
- Actors
  - actor aggregation and search
- Library
  - concrete library content browsing
- Genre / Series
  - aggregate category browsing
- Settings
  - app preferences, theme, language, and version-check entry
