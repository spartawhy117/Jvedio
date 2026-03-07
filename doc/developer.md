# Developer

`doc/` 只保留两类文档：

- `doc/developer.md`：开发索引
- `doc/CHANGELOG.md`：变更日志

![Module overview](assets/diagrams/overview.svg)

## Scope

| Item | Path |
|--|--|
| Solution | `Jvedio-WPF/Jvedio.sln` |
| App | `Jvedio-WPF/Jvedio` |
| Tests | `Jvedio-WPF/Jvedio.Test` |
| Build target | `x86` |
| Runtime dependency | `FFmpeg` |

## Read First

1. `Jvedio-WPF/Jvedio/App.xaml.cs`
2. `Jvedio-WPF/Jvedio/WindowStartUp.xaml.cs`
3. `Jvedio-WPF/Jvedio/Core/Config/ConfigManager.cs`
4. `Jvedio-WPF/Jvedio/Mapper/MapperManager.cs`
5. `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml.cs`

## Module Docs

| Module | Doc |
|--|--|
| Bootstrap + Startup | `doc/modules/01-bootstrap-startup.md` |
| Config + Persistence | `doc/modules/02-config-persistence.md` |
| Main UI + Tabs | `doc/modules/03-main-ui.md` |
| Scan + Import | `doc/modules/04-scan-import.md` |
| Metadata Sync + Plugins | `doc/modules/05-sync-plugin.md` |
| Media + Maintenance | `doc/modules/06-media-maintenance.md` |

## Core Rules

- Startup order is strict: mapper -> config -> plugin -> server config -> main window
- `ConfigManager`, `MapperManager`, `PathManager`, `App` are global hubs
- UI is hybrid MVVM; do not assume logic only lives in ViewModels
- Structural changes must also update `doc/CHANGELOG.md`

## Current Top Risks

- `WindowStartUp.xaml.cs` startup order is fragile
- `VieModel_VideoList.cs` has heavy query/render paths on large libraries
- `Window_Details.xaml.cs` and `VieModel_Details.cs` still do aggressive refresh work
- Plugin loading in `CrawlerManager.cs` is reflection-heavy and trust-based
