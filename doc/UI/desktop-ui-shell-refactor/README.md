# Desktop UI Shell Refactor

This directory contains the stable design specifications for the desktop UI shell refactor.

## Directory layout

- `references.md`
  - external visual references and reuse constraints
- `information-architecture.md`
  - main window page tree and navigation structure
- `main-shell-spec.md`
  - shared desktop shell, fixed left rail, and global navigation rules
- `home-page-spec.md`
  - media-library management home page
- `favorites-page-spec.md`
  - favorites page
- `actors-page-spec.md`
  - actors page
- `library-page-spec.md`
  - individual library content page
- `settings-page-spec.md`
  - standalone settings window
- `theme-spec.md`
  - Light and Dark token rules
- `icon-config-spec.md`
  - icon resource, manifest, and build integration process
- `drawing-output-guide.md`
  - drawing MCP output rules

## Output directories

- `wireframes/`
  - low-fidelity page structure drawings
- `mockups/`
  - Light/Dark visual drafts
- `assets/`
  - support images or exported visual references created during the design phase

## Current status

- Text specifications are ready.
- The current wireframe batch now covers the shared shell, Home, Favorites, Actors, Library Content, Settings, Library Editor, and the navigation/icon semantic diagram defined in `drawing-output-guide.md`.
- The wireframe batch should currently be exported in the Light theme direction first.
- The old footer popup pattern with two expandable options is removed from the current shell direction.
- The main shell is now maintained as a shared document and shared wireframe so content pages can focus on right-side layout changes only.
- Existing screenshots remain in [old](D:\study\Proj\Jvedio\doc\UI\old) for before/after comparison.

## Generated wireframes

- `main-shell-wireframe-v1`
  - Share link: https://excalidraw.com/#json=5Uo7qukFijjLxGh-M69sy,MEKGfQj_bY2N3nhCwZh_1g
  - Note: shared Light-theme shell with fixed left navigation width, adaptive right content area, `智能分类` group, and the `设置` button moved into the title area next to the app icon/title.
- `home-wireframe-v1`
  - Share link: https://excalidraw.com/#json=lrZuOVI6C8SeJZcf7bIIy,z81wTPlEZpcoFDPnlF4ESw
  - Note: Home content-area wireframe only, reusing the shared shell and keeping the list-first layout, no cover column, no hide/show-library flow, and row-level incremental `扫描` actions with red/green quick-check states every time Home is entered.
- `favorites-wireframe-v1`
  - Share link: https://excalidraw.com/#json=KdYMC5ANgjlBcGbgn5UUE,HYuSTQznw2cuEBfi9l0QNw
  - Note: Favorites content-area wireframe only, reusing the shared shell with no search box, only name/release-date sorting, and bottom-right paging for about 30 items at 1080p.
- `actors-wireframe-v1`
  - Share link: https://excalidraw.com/#json=MYL3yGrHhMlgwnjejdrzi,8j87lXy8PXdCEf84gTmn1w
  - Note: Actors content-area wireframe only, reusing the shared shell for all actresses in configured libraries, with fixed-size avatars, adaptive card columns, and only name/count content inside each card.
- `library-content-wireframe-v1`
  - Share link: https://excalidraw.com/#json=58Q8GKz77TdSFhor9-MD6,a8d2zB1p1PYI9eoR5WuCJA
  - Note: Library content-area wireframe only, reusing the shared shell with `VID / 名称 / 发布时间` sorting, bottom-right paging, and a default first-page density of about 50 videos.
- `settings-wireframe-v1`
  - Share link: https://excalidraw.com/#json=Tf6lDPDbpv3XWQ7GPTXGV,gXueF9eZsyYETAlL7g74Og
  - Note: settings shell opens directly from the rail footer button, keeps the original left navigation categories, and is now exported in the Light theme direction with a compact single-list page body.
- `library-wireframe-v1`
  - Share link: https://excalidraw.com/#json=6IFOEtnWDxiED6GzmX6Kh,EEBSXN9TzvsjkN6Be883Dw
  - Note: This wireframe currently represents the Library Editor window. Home `Editor` opens a compact Light-theme library editor that uses the same left-side navigation pattern as settings and currently exposes only the `扫描路径` configuration row while scan and scraping defaults stay automatic.
- `navigation-icon-semantics-v1`
  - Share link: https://excalidraw.com/#json=pQ9SEVY2zi000OfAX0SvV,7C0Ls4OL8mpDFcPc20mawA
  - Note: maps shell destinations and shared actions to the first-phase semantic icon keys in `icon-config-spec.md`.

## Local export copies

- Local exported `.png` and `.excalidraw` copies for the first batch are stored under [doc/UI/new](D:\study\Proj\Jvedio\doc\UI\new).
- This folder is intended for direct screenshot review and iterative adjustment during the current UI refactor phase.
