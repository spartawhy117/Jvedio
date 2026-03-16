# Icon Configuration Spec

## Configuration model

- Use `resource directory + manifest`.
- Do not rely only on ad-hoc file names.
- Do not rely only on font icons long term.

## Directory structure

- Icon source directory:
  - `Jvedio-WPF/Jvedio/Resources/Icons/`
- Manifest:
  - `Jvedio-WPF/Jvedio/Resources/Icons/icon-manifest.json`
- WPF resource bridge:
  - `Jvedio-WPF/Jvedio/Resources/Icons/IconResources.xaml`

## Manifest schema

Each icon entry must define at least:

- `key`
- `source`
- `themeVariant` or a default color strategy
- `size`
- `kind`

Suggested `kind` values:

- `nav`
- `action`
- `status`

## Required semantic keys in the first phase

- `brand.app`
- `nav.library-management`
- `nav.settings`
- `nav.favorites`
- `nav.actors`
- `nav.library`
- `nav.category`
- `nav.series`
- `action.search`
- `action.add-library`
- `action.delete-library`
- `action.rename-library`

## Shell icon rhythm

- In the shared main shell, the brand area uses `brand.app` on the left and the product name on the right.
- First-level navigation uses a consistent `icon left + name right` rhythm.
- `智能分类` and `影视库` are section titles, not clickable icon entries; their child rows continue to use the same icon-left layout as the primary nav.

## Build-time display process

1. Place SVG or equivalent vector icon sources in `Resources/Icons/`.
2. Register each icon in `icon-manifest.json` with its semantic key.
3. Generate or maintain `IconResources.xaml` so WPF pages can consume semantic resources.
4. In XAML, reference semantic keys instead of raw file paths.
5. Ensure the project packages icon assets as `Resource` so build output can resolve them.

## Transition strategy

- Phase 1:
  - allow `FontAwesome.WPF` to remain as a fallback or transition layer
- Phase 2:
  - progressively replace mixed icon usage with unified semantic resources from the manifest pipeline

## Implementation note

- A later helper script may be introduced to validate or generate the XAML bridge from the manifest.
- This document only fixes the contract, not the final script implementation.
