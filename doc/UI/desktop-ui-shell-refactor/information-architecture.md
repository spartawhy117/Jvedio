# Information Architecture

## Main window

- Left navigation rail
  - fixed order from top to bottom
  - Home
  - Favorites
  - Actors
  - Media Libraries
    - one entry per configured library
  - Categories
    - Genre
    - Series
  - Settings is not part of the left rail in this refactor
- Right content area
  - Home page
  - Favorites page
  - Actors page
  - Library page
  - Genre page
  - Series page

## Top-right actions

- Search action
- Optional small status or utility actions
  - keep these secondary to search and settings
- Settings entry
  - gear icon
  - label text
  - opens the standalone settings window

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
- Opening settings:
  - does not replace the main page
  - opens a separate settings window
  - does not add a settings destination into the main left rail

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
  - app preferences, theme, language, paths, scanning, MetaTube
