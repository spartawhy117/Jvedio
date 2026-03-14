# Settings Page Spec

## Purpose

- Keep settings in a standalone window, opened from the top-right gear + label entry in the main shell.

## Layout

- Two-column structure:
  - left navigation
  - right scrollable content area
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
