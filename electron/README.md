# ⚠️ DEPRECATED — Electron Shell

> **Status**: Deprecated as of Phase 4 (`desktop-ui-shell-refactor`)
>
> This directory is **no longer the active product path**. The desktop shell has been migrated to **Tauri 2 + React + TypeScript** in the `tauri/` directory.

## What this was

This directory contained the Stage C-1 shell scaffold for the Electron desktop entry:

- `main/` — Electron main-process lifecycle and worker bootstrap.
- `preload/` — Minimal bridge for app version and worker base URL.
- `renderer/` — Placeholder shell page used to validate the startup chain.

## Why it's deprecated

- The Electron shell was a half-finished prototype that never completed a full end-to-end verification cycle.
- The new Tauri shell (`tauri/`) has completed Phase 0–4 of the migration plan, with all business pages implemented and shared components in place.
- The `App.xaml.cs` launcher has been switched from `ElectronShellLauncher` to `TauriShellLauncher`.
- The `Jvedio.csproj` build target has been switched from `PrepareElectronShellArtifacts` to `PrepareTauriShellArtifacts`.

## When will it be removed?

This directory will be physically deleted in **Phase 5** (final cleanup) after:
1. All pages and dialogs pass full regression under the Tauri shell.
2. Release build/packaging/startup chain is verified stable.
3. At least one complete end-to-end verification pass.

Until then, it is retained as a **historical reference only** — do not run, build, or extend this code.
