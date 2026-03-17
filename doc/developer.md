# 开发者文档

`doc/` 仅维护：

- `doc/developer.md`：开发总览
- `doc/modules/`：模块文档
- `doc/CHANGELOG.md`：变更日志
- `doc/test-targets.md`：测试目标文档
- `doc/test-plan.md`：测试计划文档
- `doc/test-current-suite.md`：当前测试清单

历史 planning 归档：

- `plan/archive/metatube-only-plan/README.md`：MetaTube 唯一搜刮源历史计划归档说明

## 项目范围

| 项目 | 路径 |
|--|--|
| 解决方案 | `Jvedio-WPF/Jvedio.sln` |
| 主程序 | `Jvedio-WPF/Jvedio` |
| 测试 | `Jvedio-WPF/Jvedio.Test` |
| 编译目标 | `x86` |
| 运行依赖 | `FFmpeg` |

## 阅读顺序

1. `Jvedio-WPF/Jvedio/App.xaml.cs`
2. `Jvedio-WPF/Jvedio/WindowStartUp.xaml.cs`
3. `Jvedio-WPF/Jvedio/Core/Config/ConfigManager.cs`
4. `Jvedio-WPF/Jvedio/Mapper/MapperManager.cs`
5. `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml.cs`

## 模块文档

| 模块 | 文档 |
|--|--|
| 启动与引导 | `doc/modules/01-bootstrap-startup.md` |
| 配置与持久化 | `doc/modules/02-config-persistence.md` |
| 主界面与标签页 | `doc/modules/03-main-ui.md` |
| 扫描与导入 | `doc/modules/04-scan-import.md` |
| 信息同步与插件 | `doc/modules/05-sync-plugin.md` |
| 媒体处理与维护工具 | `doc/modules/06-media-maintenance.md` |
| 数据库结构 | `doc/modules/07-database-schema.md` |
| 实体与关系 | `doc/modules/08-entity-relations.md` |
| 对话框与提示窗口 | `doc/modules/09-dialogs.md` |
| 工具与外部依赖 | `doc/modules/10-utils-extern.md` |
| 样式与主题 | `doc/modules/11-style-theme.md` |
| 日志编辑器支持 | `doc/modules/12-avalonedit.md` |

## 核心规则

- 启动顺序固定：`Mapper -> Config -> Plugin -> ServerConfig -> MainWindow`
- `ConfigManager`、`MapperManager`、`PathManager`、`App` 是全局枢纽
- 当前 UI 是 `MVVM + code-behind` 混合结构
- 结构调整后同步更新 `doc/CHANGELOG.md`

## 当前重点问题

- 列表页查询和渲染在大库下仍然偏重
- 扫描导入仍有较多 IO 与内存判重逻辑
- 详情页刷新和媒体加载仍然容易产生卡顿
- 插件加载仍是反射驱动，校验较弱
