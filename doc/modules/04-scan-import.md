# Scan + Import

![Scan flow](../assets/diagrams/scan-flow.svg)

## Scope

| Area | Files |
|--|--|
| scan task | `Jvedio-WPF/Jvedio/Core/Scan/ScanTask.cs` |
| scan helpers | `Jvedio-WPF/Jvedio/Core/Scan/ScanHelper.cs` |
| task manager | `Jvedio-WPF/Jvedio/Core/Tasks/ScanManager.cs` |
| parser dependency | `Jvedio-WPF/Jvedio/Utils/Extern/JvedioLib.cs` |

## Owns

- directory walk and file filtering
- VID extraction and NFO import
- duplicate detection and import decisions
- video/entity insert and relation creation
- scan result reporting into UI

## Change Checklist

- filename rule change: inspect `ScanHelper` and parser calls
- duplicate rule change: inspect `ScanTask.HandleImport()`
- NFO behavior change: inspect `HandleImportNFO()` and parser options

## Current Performance / Bug Issues

- `ScanTask.cs` loads existing videos and then repeatedly filters them with in-memory checks and `File.Exists`, which scales poorly on large libraries
- scan and import logic are long and branch-heavy; regressions are easy when adding new file rules
- cancellation exists, but many loops still combine IO + DB work in one task path
