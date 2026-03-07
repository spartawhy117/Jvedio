# Media + Maintenance

![Media and maintenance flow](../assets/diagrams/media-maintenance.svg)

## Scope

| Area | Files |
|--|--|
| screenshot tasks | `Jvedio-WPF/Jvedio/Core/FFmpeg/ScreenShotTask.cs` |
| ffmpeg wrapper | `Jvedio-WPF/Jvedio/Core/FFmpeg/ScreenShot.cs` |
| image cache | `Jvedio-WPF/Jvedio/Core/Media/ImageCache.cs` |
| DB tools | `Jvedio-WPF/Jvedio/Windows/Window_DataBase.xaml.cs` |
| upgrade helper | `Jvedio-WPF/Jvedio/Upgrade/UpgradeHelper.cs` |

## Owns

- screenshot and GIF generation
- cached image access
- database cleanup/index tasks
- upgrade UI handoff and migration tooling

## Change Checklist

- screenshot output change: inspect `ScreenShotTask`, `ScreenShot`, `FFmpegConfig`
- cache issue: inspect `ImageCache`
- DB cleanup task change: inspect `Window_DataBase`
- migration/upgrade change: inspect `UpgradeHelper` + `Jvedio4ToJvedio5`

## Current Performance / Bug Issues

- `ImageCache.Clear()` disposes `MemoryCache.Default` and does not recreate it, which is fragile for later cache access
- `Window_DataBase.xaml.cs` cleanup jobs rely on fixed delays and contain deletion logic that is easy to mis-handle across multiple scan roots
- detail/media refresh path still forces GC and rescans folders, which can cause visible UI jank
