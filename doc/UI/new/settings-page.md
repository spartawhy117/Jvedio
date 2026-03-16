# Settings Page Spec

## Purpose

- Keep settings in a standalone shell, opened directly from the top-most settings navigation button in the main left rail.
- `版本检查` is one page inside the settings window, not a separate shell popup action.

## Layout

- Compact two-column structure inspired by the WeChat desktop settings window:
  - narrow left navigation
  - right scrollable content list
- Window header:
  - minimal title treatment
  - close button
- Right content style:
  - use a single compact vertical list per page
  - do not split the first version into multiple cards or sections
  - keep row spacing tight
  - use inline controls at the right side of each row when needed

## Left navigation

- 基本
- 图片
- 扫描与导入
- 网络
- 库
- MetaTube
- 版本检查

Only one left-nav item is selected at a time.

## Right content rules

- Every page should read as one compact list instead of stacked cards.
- Use short row labels and short helper text only when necessary.
- Prefer a denser visual rhythm similar to WeChat desktop settings.

## Language and theme rules

- No dedicated first-run language/theme picker window.
- Language choices exposed in settings:
  - 中文
  - English
- Theme choices exposed in settings:
  - Light
  - Dark
- Underlying config should remain extensible for future additional languages or themes, but the UI in this phase exposes only the options above.

## Current iteration rule

- Keep the original left-side page categories for now.
- Do not over-specify each page's detailed fields in this round.
- During later page-by-page implementation, the function list and UI layout can be refined together.
- For the current wireframe batch, one representative compact list is enough to show the shell direction.

## Version-check rules

- Version checks are manual in this phase.
- The version-check page should use the same compact list style as the other settings pages.
- The UI may surface:
  - current version
  - latest-version status after a user-triggered check
  - a button that checks for updates
  - a button or link that opens the project release page
- Do not design an in-app download-and-install flow for this phase.

## Drawing rule for first batch

- The first settings wireframe should show the compact WeChat-like shell direction clearly.
- The wireframe should show the existing left navigation categories plus `版本检查`.
- The selected state can stay on `基本`.
- The right content area should render one compact list for the selected page instead of grouped cards.
- The current exported wireframe batch should use the Light theme direction first.
