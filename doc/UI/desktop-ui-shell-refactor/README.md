# Desktop UI Shell Refactor

This directory contains the stable design specifications for the desktop UI shell refactor.

## Directory layout

- `references.md`
  - external visual references and reuse constraints
- `information-architecture.md`
  - main window page tree and navigation structure
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
- No drawing MCP is currently connected in this session.
- The first drawing batch should cover Home, Favorites, Actors, Settings, and the navigation/icon semantic diagram defined in `drawing-output-guide.md`.
- Existing screenshots remain in [old](D:\study\Proj\Jvedio\doc\UI\old) for before/after comparison.

## Generated wireframes

- `home-wireframe-v1`
  - Share link: https://excalidraw.com/#json=v8ELfliDTKT9kXs0JoaCs,R3vgj12JLt0QKrhb3RadtA
  - Note: main shell + Home list-first layout, with non-empty library rows and top-right Settings entry.
- `favorites-wireframe-v1`
  - Share link: https://excalidraw.com/#json=OrGynS-X97WBYc9NBxXxh,ZaXVsJns7DI0xReGGj-iSg
  - Note: first-level Favorites content page, grid-first example, no library CRUD actions.
- `actors-wireframe-v1`
  - Share link: https://excalidraw.com/#json=TO5ncnp97Ak26o7zEt7fe,QC4GxUCzG9V7Y0vrKQKeAg
  - Note: actor aggregation page, card/list-capable top row, no library-management controls.
- `settings-wireframe-v1`
  - Share link: https://excalidraw.com/#json=jtWUjWmpwjHzoRz27Bf46,0RGYciHEBQVj2xuoreko6A
  - Note: standalone settings window with `基本` selected, 3 cards shown, bottom action bar fixed.
- `navigation-icon-semantics-v1`
  - Share link: https://excalidraw.com/#json=pQ9SEVY2zi000OfAX0SvV,7C0Ls4OL8mpDFcPc20mawA
  - Note: maps shell destinations and shared actions to the first-phase semantic icon keys in `icon-config-spec.md`.

## Local export copies

- Local exported `.png` and `.excalidraw` copies for the first batch are stored under [doc/UI/new](D:\study\Proj\Jvedio\doc\UI\new).
- This folder is intended for direct screenshot review and iterative adjustment during the current UI refactor phase.
