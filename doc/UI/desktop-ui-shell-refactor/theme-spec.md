# Theme Spec

## Supported themes

- Light
- Dark

No other themes are exposed in the first refactor phase.

## Shared token categories

- Window background
- Secondary panel background
- Card background
- Primary text
- Secondary text
- Accent color
- Danger color
- Border color
- Divider color
- Hover state
- Selected state
- Disabled state

## Light theme direction

- Main background:
  - warm or neutral light gray
- Secondary panel:
  - slightly darker than the main background
- Cards:
  - soft white or near-white with subtle borders
- Text:
  - dark neutral for primary, medium neutral for secondary
- Accent:
  - restrained green for interactive confirmation and active controls

## Dark theme direction

- Main background:
  - deep neutral gray rather than pure black
- Secondary panel:
  - slightly raised gray
- Cards:
  - one level lighter than the panel with weak borders
- Text:
  - high-contrast soft white for primary, gray for secondary
- Accent:
  - restrained green consistent with Light theme semantics

## Behavior

- On first run, initialize from the current system light/dark preference once.
- After initialization, users can switch explicitly between Light and Dark in Settings.
- The configuration model must keep room for future theme expansion even though the current UI does not expose more options.
