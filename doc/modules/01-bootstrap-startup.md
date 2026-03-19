# 启动与引导

## 范围

| 区域 | 文件 |
|--|--|
| 应用入口 | `dotnet/Jvedio/App.xaml.cs` |
| 启动窗口 | `dotnet/Jvedio/WindowStartUp.xaml.cs` |
| 启动 VM | `dotnet/Jvedio/ViewModels/VieModel_StartUp.cs` |
| 升级迁移 | `dotnet/Jvedio/Upgrade/Jvedio4ToJvedio5.cs` |

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
- 初始页左下角入口：`WindowStartUp.xaml` 中选择库页底部的 `SettingHoverPath`
- 选择库页顶部工具区：`WindowStartUp.xaml` 与 `VieModel_StartUp.cs`
- 版本显示来源：`App.GetLocalVersion()` 与 `Properties/AssemblyInfo.cs`

## 当前性能 / Bug 问题

- `WindowStartUp.xaml.cs` 启动链路强串行，迁移、备份、插件处理都在同一路径
- 启动模块对顺序非常敏感，回归风险高
- 默认库打开逻辑已修复空判断，但该区域仍是高风险入口
- 启动阶段的插件移动、插件删除和备份流程已去掉无意义的短延迟，`CrawlerManager.Init(true)` 后也不再重复读取一次服务器配置
- `plugins/temp` 缺失时已改为直接跳过，不再把正常的“无待迁移插件”场景记录成错误日志
- 初始页左下角设置按钮已移除，避免在“选择/新建库”阶段暴露额外入口并分散启动流程
- 初始页搜索框及其筛选逻辑已移除，当前选择库页只保留排序、显示隐藏与新建库入口
