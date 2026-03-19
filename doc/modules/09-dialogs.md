# 对话框与提示窗口

## 范围

| 区域 | 文件 |
|--|--|
| 通知公告 | `dotnet/Jvedio/WindowsDialog/Dialog_Notice.xaml.cs` |
| 新视频对话框 | `dotnet/Jvedio/WindowsDialog/Dialog_NewMovie.xaml.cs` |
| 日志查看 | `dotnet/Jvedio/WindowsDialog/Dialog_Logs.xaml.cs` |
| 启动加载页 | `dotnet/Jvedio/WindowsDialog/Dialog_LoadPage.xaml.cs` |

## 负责内容

- 启动过程提示
- 新视频录入反馈
- 日志查看与消息展示
- 公告与一次性提醒

## 改动入口

- 新增全局提示：优先复用现有 `Dialog_*`
- 启动提示链路：配合 `WindowStartUp`
- 错误展示：配合 `Window_ErrorMsg` / `Dialog_Logs`

## 当前性能 / Bug 问题

- `Dialog_LoadPage.xaml.cs` 已修复网站列表初始为空时的空引用风险，并统一站点列表的增删与归一化行为
- 对话框本身较轻，当前主要风险在于与主流程耦合较深
- 弹窗时机多在启动、下载、任务失败路径，回归时需要注意阻塞主流程
