# 启动与引导

![启动流程](../assets/diagrams/startup-flow.svg)

## 范围

| 区域 | 文件 |
|--|--|
| 应用入口 | `Jvedio-WPF/Jvedio/App.xaml.cs` |
| 启动窗口 | `Jvedio-WPF/Jvedio/WindowStartUp.xaml.cs` |
| 启动 VM | `Jvedio-WPF/Jvedio/ViewModels/VieModel_StartUp.cs` |
| 升级迁移 | `Jvedio-WPF/Jvedio/Upgrade/Jvedio4ToJvedio5.cs` |

## 负责内容

- 全局日志与任务管理器初始化
- 单实例控制
- 启动迁移、备份、插件移动/删除
- 默认库打开与主窗口切换

## 关键依赖

- `InitMapper()` 先于 `ConfigManager.Init()`
- `CrawlerManager.Init(true)` 先于 `ConfigManager.ServerConfig.Read()`
- 退出路径依赖 `ConfigManager.SaveAll()`

## 改动入口

- 启动顺序：`WindowStartUp.Window_Loaded()`
- 默认库打开：`WindowStartUp.LoadDataBase()`
- 首次运行：`InitFirstRun()`

## 当前性能 / Bug 问题

- `WindowStartUp.xaml.cs` 启动链路强串行，迁移、备份、插件处理都在同一路径
- 启动模块对顺序非常敏感，回归风险高
- 默认库打开逻辑已修复空判断，但该区域仍是高风险入口
