## Feature Goal

- Persist the full desktop UI shell refactor planning package before any code implementation begins.

## Confirmed Scope

- Keep this as the only active feature.
- Create the planning docs under `plan/active/desktop-ui-shell-refactor/`.
- Create the stable design docs under `doc/UI/desktop-ui-shell-refactor/`.
- Do not modify production UI code yet.
- Keep `doc/UI/old/` as the pre-refactor screenshot baseline.

## Current Todo Summary

1. Wait for drawing MCP installation and produce the first wireframes and mockups from the new specs.
2. Review the drawings against the page specs and lock the final layout before implementation.
3. Start the WPF implementation only after the drawing review is complete.

## Execution Order

1. Use `information-architecture.md`, `home-page-spec.md`, `settings-page-spec.md`, and `theme-spec.md` as drawing inputs.
2. Output drawing artifacts into:
   - `doc/UI/desktop-ui-shell-refactor/wireframes/`
   - `doc/UI/desktop-ui-shell-refactor/mockups/`
3. After design review, begin implementation with theme and icon infrastructure first, then main shell, then settings, then validation.

## Validation Steps

- Confirm `plan/active/desktop-ui-shell-refactor/` is the only active feature directory.
- Confirm the design spec directory contains all required page, theme, icon, and drawing guide docs.
- Confirm the repository still builds in Release after the documentation changes.

## Blockers And Caveats

- A drawing MCP is not yet available in the current session, so only text specifications are prepared.
- The current WPF codebase still contains library CRUD logic in `WindowStartUp`; implementation must migrate that logic into the new home page later.
- The app will expose only `中文 / English` and `Light / Dark` in the first UI refactor phase, even though the underlying configuration should remain extensible.
