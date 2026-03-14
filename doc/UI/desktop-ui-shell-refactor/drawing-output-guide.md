# Drawing Output Guide

## Goal

- After a drawing MCP is installed, generate stable wireframes and mockups from the specs in this directory before implementing UI code.

## Drawing inputs

- `main-shell-spec.md`
- `information-architecture.md`
- `home-page-spec.md`
- `settings-page-spec.md`
- `theme-spec.md`
- `icon-config-spec.md`

## Required first-batch outputs

- Shared main shell wireframe
- Home content-page wireframe
- Home page Light mockup
- Home page Dark mockup
- Favorites page wireframe
- Actors page wireframe
- Library content page wireframe
- Settings page wireframe
- Settings page Light mockup
- Settings page Dark mockup
- Navigation and icon semantic diagram

## Output locations

- Wireframes:
  - `wireframes/`
- Mockups:
  - `mockups/`
- Support images:
  - `assets/`

## Naming rules

- Wireframes:
  - `main-shell-wireframe-v1.*`
  - `home-wireframe-v1.*`
  - `favorites-wireframe-v1.*`
  - `actors-wireframe-v1.*`
  - `library-content-wireframe-v1.*`
  - `settings-wireframe-v1.*`
- Mockups:
  - `home-light-v1.*`
  - `home-dark-v1.*`
  - `settings-light-v1.*`
  - `settings-dark-v1.*`
- Diagrams:
  - `navigation-icon-semantics-v1.*`

## First-batch drawing constraints

- The shared shell wireframe should show the fixed-width left rail and adaptive right content area.
- The content-page wireframes should focus on the right content area and assume the shared shell is already present.
- The Home wireframe should show the non-empty library-management list layout as the primary case.
- The Settings wireframe and mockups should use the `基本` section as the selected state.
- The navigation and icon semantic diagram should map first-level destinations and the semantic icon keys defined in `icon-config-spec.md`.

## Review rules

- Do not begin implementation from drawings that contradict these specs.
- If a drawing introduces a new behavior or layout rule, update the corresponding spec document first.
- Every exported drawing should be accompanied by a short note in the related page spec or in this directory README.
