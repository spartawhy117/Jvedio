# Drawing Output Guide

## Goal

- After a drawing MCP is installed, generate stable wireframes and mockups from the specs in this directory before implementing UI code.

## Drawing inputs

- `information-architecture.md`
- `home-page-spec.md`
- `settings-page-spec.md`
- `theme-spec.md`
- `icon-config-spec.md`

## Required first-batch outputs

- Main shell home page wireframe
- Home page Light mockup
- Home page Dark mockup
- Favorites page wireframe
- Actors page wireframe
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
  - `home-wireframe-v1.*`
  - `favorites-wireframe-v1.*`
  - `actors-wireframe-v1.*`
- Mockups:
  - `home-light-v1.*`
  - `home-dark-v1.*`
  - `settings-light-v1.*`
  - `settings-dark-v1.*`

## Review rules

- Do not begin implementation from drawings that contradict these specs.
- If a drawing introduces a new behavior or layout rule, update the corresponding spec document first.
- Every exported drawing should be accompanied by a short note in the related page spec or in this directory README.
