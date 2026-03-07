# Metadata Sync + Plugins

![Sync and plugin flow](../assets/diagrams/sync-flow.svg)

## Scope

| Area | Files |
|--|--|
| download task | `Jvedio-WPF/Jvedio/Core/Net/DownLoadTask.cs` |
| downloader | `Jvedio-WPF/Jvedio/Core/Net/VideoDownLoader.cs` |
| crawler plugin loader | `Jvedio-WPF/Jvedio/Core/Plugins/Crawler/CrawlerManager.cs` |
| server model | `Jvedio-WPF/Jvedio/Core/Crawler/CrawlerServer.cs` |
| settings UI | `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml.cs` |

## Owns

- crawler plugin discovery and load
- site/server selection
- metadata fetch by VID
- poster/thumb/actor/preview download
- proxy/header/server configuration

## Dependency Rules

- crawler plugin load must happen before server config read
- download tasks expect `Video` and active DB context to be valid
- image write paths depend on `Settings.PicPaths` and `PathManager`

## Change Checklist

- site compatibility issue: inspect `VideoDownLoader` + plugin output shape
- plugin load issue: inspect `CrawlerManager` folder layout and metadata files
- actor/poster issue: inspect `DownLoadTask` image save branches

## Current Performance / Bug Issues

- plugin load is reflection-heavy and trusts the first DLL in each folder
- download flow mixes remote fetch, image save, DB write, and UI status updates in one task object
- server and plugin state are loosely validated, so misconfigured plugins can fail late at runtime
