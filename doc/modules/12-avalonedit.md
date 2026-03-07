# 日志编辑器支持

## 范围

| 区域 | 文件 |
|--|--|
| 编辑器管理 | `Jvedio-WPF/Jvedio/AvalonEdit/AvalonEditManager.cs` |
| 高亮辅助 | `Jvedio-WPF/Jvedio/AvalonEdit/Utils.cs` |
| 语法高亮资源 | `Jvedio-WPF/Jvedio/AvalonEdit/Highlighting/` |

## 负责内容

- 日志文本展示
- 日志高亮规则加载
- 日志查看窗口的编辑器支持

## 改动入口

- 日志高亮：`AvalonEdit/Highlighting`
- 编辑器初始化：`AvalonEditManager`
- 日志展示行为：`Dialog_Logs`

## 当前性能 / Bug 问题

- 该模块整体较稳定，主要风险在大日志文件打开时的渲染与高亮开销
- 若后续要优化日志查看体验，这里会是独立切入点
