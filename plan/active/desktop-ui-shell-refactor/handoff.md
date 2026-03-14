## Feature Goal

- Persist the full desktop UI shell refactor planning package before any code implementation begins.

## Confirmed Scope

- Keep this as the only active feature.
- Create the planning docs under `plan/active/desktop-ui-shell-refactor/`.
- Create the stable design docs under `doc/UI/desktop-ui-shell-refactor/`.
- Do not modify production UI code yet.
- Keep `doc/UI/old/` as the pre-refactor screenshot baseline.

## Current Todo Summary

1. Continue page-by-page refinement of the UI wireframes and related functional documentation.
2. Lock the shared shell and each right-content page layout before entering WPF implementation.
3. Start the WPF implementation only after the page-level drawing review is complete.

## Latest Progress

- The drawing MCP is now available and the first Light-theme wireframe batch has been exported into `doc/UI/new/`.
- A shared shell spec and shared shell wireframe are now in place:
  - fixed-width left rail
  - adaptive right content area
  - `设置` moved to the title area next to `Jvedio`
  - `智能分类` added with `类别` and `系列`
- Main content pages were split into shared-shell + content-only drawings to reduce repeated updates:
  - Home content
  - Favorites content
  - Actors content
  - Library content
- Separate window drawings remain independent:
  - Settings window
  - Library Editor window
- The current round still changes documentation and drawings only; no production WPF UI code has been modified.

## Next Recommended Work

1. Refine each page one by one, starting from the shared shell and then the highest-frequency content pages.
2. For each page, update the page spec first and then redraw the matching wireframe.
3. Expand the function-level documentation together with UI refinement so implementation can follow a page-by-page handoff instead of reinterpreting behavior later.
4. Delay WPF implementation until the page-level functional rules are stable enough to avoid repeated shell churn.

## Execution Order

1. Use `main-shell-spec.md`, `information-architecture.md`, page specs, and `theme-spec.md` as the primary drawing inputs.
2. Output drawing artifacts into:
   - `doc/UI/desktop-ui-shell-refactor/wireframes/`
   - `doc/UI/desktop-ui-shell-refactor/mockups/`
3. In the current phase, keep iterating page specs and wireframes page by page until the shell and content rules are stable.
4. After design review, begin implementation with theme and icon infrastructure first, then main shell, then settings, then validation.

## Validation Steps

- Confirm `plan/active/desktop-ui-shell-refactor/` is the only active feature directory.
- Confirm the design spec directory contains all required page, theme, icon, and drawing guide docs.
- Confirm the repository still builds in Release after the documentation changes.

## Blockers And Caveats

- The current WPF codebase still contains library CRUD logic in `WindowStartUp`; implementation must migrate that logic into the new home page later.
- The app will expose only `中文 / English` and `Light / Dark` in the first UI refactor phase, even though the underlying configuration should remain extensible.
- The current drawings are stable enough for page-by-page refinement, but they are not yet implementation-locked for every page detail.
