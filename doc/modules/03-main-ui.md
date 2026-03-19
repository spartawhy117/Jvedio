# 主界面与标签页

## 范围

| 区域 | 文件 |
|--|--|
| 主窗口 | `dotnet/Jvedio/Windows/Window_Main.xaml.cs` |
| 主 VM | `dotnet/Jvedio/ViewModels/VieModel_Main.cs` |
| 标签页管理 | `dotnet/Jvedio/ViewModels/TabItemManager.cs` |
| 视频列表 | `dotnet/Jvedio/Core/UserControls/VideoList.xaml.cs` |
| 列表 VM | `dotnet/Jvedio/Core/UserControls/ViewModels/VieModel_VideoList.cs` |
| 详情 / 编辑 | `dotnet/Jvedio/Windows/Window_Details.xaml.cs`、`dotnet/Jvedio/Windows/Window_Edit.xaml.cs` |

## 负责内容

- 主界面布局、菜单、快捷键、标签页
- 列表查询、分页、筛选、搜索、选中
- 详情页、编辑页打开与刷新
- 任务面板和标签页生命周期

## 改动入口

- 主菜单 / 标签页：`Window_Main` + `TabItemManager`
- 列表排序 / 搜索 / 分页：`VieModel_VideoList`
- 详情切换：`Window_Details`

## 当前性能 / Bug 问题

- `VieModel_VideoList.cs` 仍有较重的查询与渲染链路，大库下容易卡 UI
- 列表关联数据逐条查询已收敛为页级预加载，但分页查询本身仍偏重
- `Window_Details.Refresh(long dataID)` 的恒真判断已修复，但详情页整体刷新仍偏重
- 全局事件订阅较多，长会话下仍有重复回调风险
