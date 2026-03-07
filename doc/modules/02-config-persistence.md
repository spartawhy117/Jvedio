# Config + Persistence

![Config and persistence](../assets/diagrams/config-persistence.svg)

## Scope

| Area | Files |
|--|--|
| config registry | `Jvedio-WPF/Jvedio/Core/Config/ConfigManager.cs` |
| path layout | `Jvedio-WPF/Jvedio/Core/Config/PathManager.cs` |
| DB path state | `Jvedio-WPF/Jvedio/Core/DataBase/SqlManager.cs` |
| mapper bootstrap | `Jvedio-WPF/Jvedio/Mapper/MapperManager.cs` |
| schema | `Jvedio-WPF/Jvedio/Core/DataBase/Tables/Sqlite.cs` |

## Owns

- app/window/task/network config hydration
- user data directories, backup dirs, log dirs, plugin dirs
- sqlite file path computation
- mapper initialization and table creation
- shared CRUD infrastructure through `BaseMapper`

## Key Objects

- `ConfigManager.Settings`
- `ConfigManager.ScanConfig`
- `ConfigManager.FFmpegConfig`
- `ConfigManager.ServerConfig`
- `PathManager`
- `MapperManager`

## Change Checklist

- new setting: add config class field + read/save path + UI binding
- new DB field: update `Sqlite.cs`, entity, mapper, UI load/save path
- new filesystem output: check `PathManager` and `EnsurePicPaths()`

## Current Performance / Bug Issues

- mapper and config state are global singletons, so hidden coupling is high
- schema and runtime logic are tightly mixed; DB changes often require touching UI and task code together
- search/filter queries frequently build dynamic SQL in upper layers instead of centralizing in one repository layer
