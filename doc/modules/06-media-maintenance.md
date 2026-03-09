# 媒体处理与维护工具

![媒体与维护流程](../assets/diagrams/media-maintenance.svg)

## 范围

| 区域 | 文件 |
|--|--|
| 截图任务 | `Jvedio-WPF/Jvedio/Core/FFmpeg/ScreenShotTask.cs` |
| FFmpeg 包装 | `Jvedio-WPF/Jvedio/Core/FFmpeg/ScreenShot.cs` |
| 图片缓存 | `Jvedio-WPF/Jvedio/Core/Media/ImageCache.cs` |
| 数据库工具 | `Jvedio-WPF/Jvedio/Windows/Window_DataBase.xaml.cs` |
| 升级辅助 | `Jvedio-WPF/Jvedio/Upgrade/UpgradeHelper.cs` |

## 负责内容

- 截图与 GIF 生成
- 图片缓存读取
- 数据库清理与索引维护
- 升级入口与迁移辅助

## 改动入口

- 截图路径：`FFmpegConfig` + `ScreenShotTask`
- 缓存策略：`ImageCache`
- 清库逻辑：`Window_DataBase`
- 升级逻辑：`UpgradeHelper`

## 当前性能 / Bug 问题

- `ImageCache.Clear()` 已移除强制 GC，避免清缓存时额外放大 UI 抖动
- `Window_DataBase.xaml.cs` 的两类清库逻辑都已去掉固定延迟等待，但该模块仍容易引入误删风险
- `ScreenShotTask.cs` 已补齐找不到视频时的任务结束路径，避免截图任务悬挂
- 详情页和截图链路都依赖文件系统扫描，媒体多时仍可能有卡顿
- 设置页中的视频处理 Tab 已隐藏，主界面与详情页中的截图/GIF 入口也已收敛；若后续要彻底下线该能力，还需继续清理残余调用链
- 显示设置页签已隐藏，界面显示相关开关改为默认开启并由保存逻辑统一兜底
- 当前 MetaTube sidecar 已开始写入影片目录，演员头像转存到软件 data 目录；后续还需把预览图目录与手动刷新覆盖行为完全统一到新规则中
- 详情页已新增 `从 MetaTube 刷新` 入口，可手动触发忽略缓存的覆盖式刷新，便于验证 sidecar 与缓存逻辑
- 当前预览图、截图和 GIF 的目录解析已不再依赖 `pic/`，统一回到影片目录 sidecar/子目录规则和通用 cache 结构
