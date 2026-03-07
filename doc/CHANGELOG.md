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
- Installed Mermaid CLI (`mmdc`) after online research so the maintained docs can include generated flowcharts and structure diagrams.
- Simplified `doc/developer.md` into an index-style maintainer guide and added module docs under `doc/modules/`.
- Added generated diagrams under `doc/assets/diagrams/` and ended each module article with current performance or bug-prone areas.
- Converted the maintained developer docs to Chinese, added `doc/modules/07-database-schema.md` and `doc/modules/08-entity-relations.md`, and regenerated the module diagrams.
- Fixed a null-check bug in `Jvedio-WPF/Jvedio/WindowStartUp.xaml.cs`, a refresh comparison bug in `Jvedio-WPF/Jvedio/Windows/Window_Details.xaml.cs`, scan-path deletion logic in `Jvedio-WPF/Jvedio/Windows/Window_DataBase.xaml.cs`, and cache-clear behavior in `Jvedio-WPF/Jvedio/Core/Media/ImageCache.cs`.
- Verified `Jvedio-WPF/Jvedio.sln` builds successfully in `Debug` after the fixes.
- Reduced `03-main-ui` page render overhead by preloading page association data in `VieModel_VideoList` instead of querying associations item-by-item during list rendering.
- Fixed `VieModel_VideoList.GetSearchCandidate()` so `Genre` candidate queries honor the current DB/filter conditions.
- Verified `Jvedio-WPF/Jvedio.sln` still builds successfully in `Debug` after the `03-main-ui` module changes.
- Reduced repeated scan-time duplicate checks in `Jvedio-WPF/Jvedio/Core/Scan/ScanTask.cs` by indexing existing videos by VID, Hash, size-path, and existing file path state instead of repeatedly scanning the full in-memory list.
- Simplified NFO import duplicate detection to reuse the same VID index during update/remove decisions.
- Verified `Jvedio-WPF/Jvedio.sln` still builds successfully in `Debug` after the `04-scan-import` module changes.
- Improved crawler plugin discovery in `Jvedio-WPF/Jvedio/Core/Plugins/Crawler/CrawlerManager.cs` by preferring DLLs that match the plugin directory or have matching metadata JSON, reducing the chance of loading dependency DLLs as crawler entry assemblies.
- Hardened crawler initialization against a missing plugin directory by handling empty directory scans safely.
- Verified `Jvedio-WPF/Jvedio.sln` still builds successfully in `Debug` after the `05-sync-plugin` module changes.
- Removed the forced `GC.Collect()` from `Jvedio-WPF/Jvedio/Core/Media/ImageCache.cs` so cache clearing no longer adds extra UI-side GC pressure.
- Simplified `Jvedio-WPF/Jvedio/Windows/Window_DataBase.xaml.cs` cleanup tasks by removing fixed post-delete waits and handling empty paths as missing files directly.
- Fixed `Jvedio-WPF/Jvedio/Core/FFmpeg/ScreenShotTask.cs` so a missing video record finalizes the task instead of leaving the screenshot task hanging.
- Verified `Jvedio-WPF/Jvedio.sln` still builds successfully in `Debug` after the `06-media-maintenance` module changes.

## [2026-03-07]

### Changed
- Fixed `Jvedio-WPF/Jvedio/Jvedio.csproj` pre-build steps so local WPF builds no longer depend on private `D:\SuperStudio\...` paths.
- Restored local buildability by ensuring output directories are created before copy steps run.
- Aligned `Jvedio-WPF` and `Jvedio.Test` to `x86`, disabled obsolete ClickOnce manifest generation, and corrected in-repo DLL reference paths.
- Updated `Jvedio-WPF/Jvedio/Upgrade/Jvedio4ToJvedio5.cs` to explicitly discard the fire-and-forget task and remove the remaining async warning.
- Verified the `Jvedio-WPF/Jvedio.sln` Debug build succeeds locally with zero warnings and zero errors.
