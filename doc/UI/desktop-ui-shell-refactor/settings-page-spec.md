# Settings Page Spec

## Purpose

- Keep settings in a standalone window, opened from the top-right gear + label entry in the main shell.

## Layout

- Two-column structure:
  - left navigation
  - right scrollable content area
- Window header:
  - title text for settings
  - optional close button
- Bottom fixed action bar:
  - `恢复默认`
  - `保存`
  - `应用`

## Left navigation

- 基本
- 图片
- 扫描与导入
- 网络
- 库
- MetaTube

Only one left-nav item is selected at a time.

## Right content rules

- Organize settings into low-elevation cards or grouped panels.
- Each card should contain one coherent setting group only.
- Use short helper text where needed.

## Language and theme rules

- No dedicated first-run language/theme picker window.
- Language choices exposed in settings:
  - 中文
  - English
- Theme choices exposed in settings:
  - Light
  - Dark
- Underlying config should remain extensible for future additional languages or themes, but the UI in this phase exposes only the options above.

## Basic page expected groups

- App behavior
  - close to tray or taskbar behavior
  - hotkey entry
- Language and appearance
  - language
  - theme
- Player
  - external player path or related playback preference

## Other page expected groups

- 图片
  - image naming or output behavior summaries
  - cache-related read-only or adjustable options that still exist in the current product
- 扫描与导入
  - scan behavior
  - organize-before-import behavior
  - import defaults that remain user-configurable
- 网络
  - request or timeout-related settings
  - proxy or connectivity-related settings when available
- 库
  - library-related defaults or management preferences that belong in settings rather than Home
- MetaTube
  - server URL
  - test video id
  - connection test
  - scrape test
  - log or diagnostics entry

## Drawing rule for first batch

- The first settings wireframe and both settings mockups should show the `基本` section as the selected left-nav item.
- The right content area should render 2 to 3 cards from the `基本` section so the shell, spacing, and action bar can be reviewed consistently.
