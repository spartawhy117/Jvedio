# Bootstrap + Startup

![Bootstrap flow](../assets/diagrams/startup-flow.svg)

## Scope

| Area | Files |
|--|--|
| App bootstrap | `Jvedio-WPF/Jvedio/App.xaml.cs` |
| Startup window | `Jvedio-WPF/Jvedio/WindowStartUp.xaml.cs` |
| Startup VM | `Jvedio-WPF/Jvedio/ViewModels/VieModel_StartUp.cs` |
| Upgrade bridge | `Jvedio-WPF/Jvedio/Upgrade/Jvedio4ToJvedio5.cs` |

## Owns

- global logger and task managers
- single-instance check
- startup migration, backup, plugin move/delete
- database open / default library selection
- first window handoff into `Window_Main`

## Read Order

1. `App.xaml.cs`
2. `WindowStartUp.xaml.cs`
3. `VieModel_StartUp.cs`
4. `Upgrade/Jvedio4ToJvedio5.cs`

## Dependency Rules

- `InitMapper()` must run before `ConfigManager.Init()`
- `CrawlerManager.Init(true)` must run before `ConfigManager.ServerConfig.Read()`
- exit path always expects `ConfigManager.SaveAll()` to succeed

## Change Checklist

- changing startup order: review `WindowStartUp.Window_Loaded`
- changing default DB open: review startup DB selection + `ConfigManager.Main.CurrentDBId`
- changing first-run logic: review theme/language dialog in `InitFirstRun()`

## Current Performance / Bug Issues

- bug risk: `WindowStartUp.xaml.cs` default DB reopen check uses `appDatabases != null || appDatabases.Count > 0`, which should be `&&`
- startup is highly serialized; backup, plugin cleanup, migration, and config load all sit on one path
- startup window is the most order-sensitive code in the project
