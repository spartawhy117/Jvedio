# Changelog

This file tracks repository changes maintained in the local `D:\study\Proj\Jvedio` clone.
Future code changes should continue adding dated entries here before commit and push.

## [Unreleased]

### Changed
- Narrowed the repository to WPF-only maintenance by removing `Jvedio-Vue`, `Jvedio-Android`, and `Jvedio-Linux`.
- Updated `README.md`, `README_EN.md`, and `README_JP.md` to state that only `Jvedio-WPF` is maintained.
- Replaced the old developer wiki page with `Jvedio-WPF/Document/Wiki/5.0/developer.md`, expanding it into a module-oriented WPF developer guide with onboarding, common change paths, and debugging notes.
- Removed the legacy `Jvedio-WPF/Document/Wiki/4.6` documentation set and the obsolete skin plugin sample documents under `Jvedio-WPF/Document/皮肤插件示例`.
- Removed the leftover `Jvedio-WPF/Document/Document.md` skin plugin note so the remaining document set stays aligned with the current WPF-only maintenance scope.
- Centralized maintained documentation under `doc/`, moved the developer guide to `doc/developer.md`, moved the changelog to `doc/CHANGELOG.md`, and removed remaining user-facing and legacy document sets.

## [2026-03-07]

### Changed
- Fixed `Jvedio-WPF/Jvedio/Jvedio.csproj` pre-build steps so local WPF builds no longer depend on private `D:\SuperStudio\...` paths.
- Restored local buildability by ensuring output directories are created before copy steps run.
- Aligned `Jvedio-WPF` and `Jvedio.Test` to `x86`, disabled obsolete ClickOnce manifest generation, and corrected in-repo DLL reference paths.
- Updated `Jvedio-WPF/Jvedio/Upgrade/Jvedio4ToJvedio5.cs` to explicitly discard the fire-and-forget task and remove the remaining async warning.
- Verified the `Jvedio-WPF/Jvedio.sln` Debug build succeeds locally with zero warnings and zero errors.
