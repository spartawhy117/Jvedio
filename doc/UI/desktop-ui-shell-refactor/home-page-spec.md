# Home Page Spec

## Purpose

- The Home page is the media-library management page.
- It replaces the old startup window as the daily place to view and manage libraries.

## Layout

- Page title: `首页` or `Home`
- Top action row:
  - search box or compact search action
  - `新建媒体库`
  - `导入 / 恢复`
  - `显示隐藏库` toggle
  - optional sort selector
- Main content:
  - flat list or low-elevation card list
  - one row per media library

## Library list fields

- Cover thumbnail
  - optional, small, left-aligned
- Library name
- Media type
- Item count
- Created time or last updated time
- Hidden-state hint when applicable

## Per-library actions

- Open library
- Rename library
- Hide / Show library
- Set cover
- Delete library

These actions should migrate from the current startup-window logic instead of being redesigned from scratch.

## Empty state

- Show a simple empty state when no library exists.
- Primary action: `新建媒体库`
- Secondary action: `导入 / 恢复`
- Text should explain that the app starts from library management now.

## Notes

- Do not use the visual poster-collage library card style as the primary home representation.
- Library management clarity is more important than visual variety on this page.
