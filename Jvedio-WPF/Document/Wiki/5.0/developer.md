# Developer

本文档面向当前仓库中仍在维护的 `Jvedio-WPF` 项目，结合原有开发者 Wiki 和当前代码结构，帮助维护者快速理解系统模块、启动链路、常见改动点和调试方式。

架构图

[<img src="https://s1.ax1x.com/2022/06/11/XcZjdH.png" alt="XcZjdH.png" style="zoom:80%;" />](https://imgtu.com/i/XcZjdH)

# 项目范围

- 当前仓库仅维护 Windows WPF 版本：`Jvedio-WPF`
- 历史上的 `Vue`、`Android`、`Linux` 目录已从当前维护分支移除
- 主解决方案文件为 `Jvedio-WPF/Jvedio.sln`
- 主应用项目为 `Jvedio-WPF/Jvedio`
- 测试项目为 `Jvedio-WPF/Jvedio.Test`

# 编译运行

1. 安装 Visual Studio 2022
2. 勾选 `.NET 桌面开发`
3. 在【单个组件】中勾选 `.NET Framework 4.7.2 SDK` 和 `.NET Framework 4.7.2 Targeting Pack`
4. 克隆仓库

```bash
git clone https://github.com/hitchao/Jvedio
```

5. 打开 `Jvedio-WPF/Jvedio.sln`
6. 执行 NuGet 还原
7. 以 `Debug` 配置启动 `Jvedio`

补充说明：

- 当前项目默认以 `x86` 方式编译，原因是依赖中存在 `x86` 的 `PInvoke.dll`
- 截图和 GIF 功能依赖 `FFmpeg`
- 当前本地维护分支已经验证 `Debug` 构建可达到 `0 warning / 0 error`

# 目录结构

```text
Jvedio-WPF/
|- Jvedio.sln                 // 主解决方案
|- Jvedio/                    // WPF 主程序
|- Jvedio.Test/               // 测试项目
|- Document/                  // 项目文档、Wiki 草稿、插件示例
|- packages/                  // NuGet 还原目录
```

主应用内部常用目录：

```text
Jvedio/
|- App.xaml(.cs)              // 程序入口
|- WindowStartUp.xaml(.cs)    // 启动窗口与启动流程
|- Core/                      // 核心服务与基础设施
|- Entity/                    // 实体模型
|- Mapper/                    // 数据访问层
|- ViewModels/                // 主要 ViewModel
|- Windows/                   // 主业务窗口
|- WindowsDialog/             // 对话框
|- Upgrade/                   // 升级与迁移
|- Resources/                 // 资源文件
|- Reference/                 // 项目依赖 DLL
|- Data/                      // 配置模板、原始资源、数据库相关文件
```

# 新维护者先看什么

建议按下面顺序阅读代码：

1. `Jvedio/App.xaml.cs`
2. `Jvedio/WindowStartUp.xaml.cs`
3. `Jvedio/Core/Config/ConfigManager.cs`
4. `Jvedio/Core/Config/PathManager.cs`
5. `Jvedio/Mapper/MapperManager.cs`
6. `Jvedio/Windows/Window_Main.xaml.cs`
7. `Jvedio/ViewModels/VieModel_Main.cs`
8. `Jvedio/Core/Scan/ScanTask.cs`
9. `Jvedio/Core/Net/DownLoadTask.cs`
10. `Jvedio/Core/Plugins/Crawler/CrawlerManager.cs`

阅读目标：

- 先理解“启动顺序”
- 再理解“全局状态从哪里来”
- 然后再看某一条业务链路，如扫描、下载、截图、插件

# 启动链路

## 1. App 初始化

入口文件：`Jvedio/App.xaml`、`Jvedio/App.xaml.cs`

`App` 负责全局初始化：

- 创建 `Logger`
- 创建任务管理器：`ScreenShotManager`、`ScanManager`、`DownloadManager`
- 注册错误反馈窗口回调
- 在 Release 下检查单实例运行
- 挂接未捕获异常处理
- 程序退出时保存所有配置

关键方法：

- `App.Init()`
- `App.OnStartup()`
- `App.OnExit()`

## 2. 启动窗口 WindowStartUp

入口文件：`Jvedio/WindowStartUp.xaml.cs`

真正的系统启动发生在 `Window_Loaded()`。这段顺序非常重要：

1. `EnsureFileExists()` / `EnsureDirExists()`
2. `InitMapper()` 初始化数据库
3. `ConfigManager.Init()` 加载全部配置
4. 迁移旧文件与旧数据库
5. 初始化运行目录
6. 自动备份数据
7. 迁移插件临时目录
8. 删除待移除插件
9. `CrawlerManager.Init(true)` 加载爬虫插件
10. `ConfigManager.ServerConfig.Read()` 读取服务器配置
11. 初始化启动页与主窗口

关键结论：

- 数据库初始化必须早于配置加载
- 爬虫插件初始化必须早于站点配置加载
- 排查启动问题时优先检查这里

# 架构特点

- 项目是“MVVM + 代码后置混合”结构，不是纯 MVVM
- 全局静态管理器很多，配置、数据库、路径、任务都是全局共享
- 许多业务编排仍然在 `Window_*.xaml.cs` 和 `UserControl` 代码后置中
- 核心任务大多继承 `AbstractTask`
- SQLite 是当前主路径，MySQL 保留了部分抽象但不是主维护方向

# 模块划分

## 1. 启动与全局状态模块

主要文件：

- `Jvedio/App.xaml.cs`
- `Jvedio/WindowStartUp.xaml.cs`
- `Jvedio/Core/Global/`

职责：

- 管理程序生命周期
- 初始化全局单例
- 协调启动阶段的数据库、配置、插件、备份、迁移与主界面

改动建议：

- 改启动流程时先确认顺序依赖
- 不要随意把 `ServerConfig.Read()` 提前到插件初始化之前

## 2. 配置模块

主要文件：

- `Jvedio/Core/Config/ConfigManager.cs`
- `Jvedio/Core/Config/PathManager.cs`
- `Jvedio/Core/Config/Common/`
- `Jvedio/Core/Config/Data/`
- `Jvedio/Core/Config/WindowConfig/`

职责：

- 创建并持有所有配置对象
- 管理设置、扫描、FFmpeg、代理、重命名、下载、插件、主题等配置
- 维护图片路径、日志路径、备份路径、插件路径

关键对象：

- `ConfigManager.Settings`
- `ConfigManager.ScanConfig`
- `ConfigManager.FFmpegConfig`
- `ConfigManager.DownloadConfig`
- `ConfigManager.PluginConfig`
- `ConfigManager.ServerConfig`
- `PathManager`

常见改动点：

- 新增配置项时，优先放到对应 `Config` 类并接入 `ConfigManager`
- 如果配置影响路径或图片输出，记得同步检查 `PathManager` 和 `EnsurePicPaths()`

## 3. 数据库与 Mapper 模块

主要文件：

- `Jvedio/Mapper/MapperManager.cs`
- `Jvedio/Core/DataBase/SqlManager.cs`
- `Jvedio/Core/DataBase/Tables/Sqlite.cs`
- `Jvedio/Mapper/BaseMapper/BaseMapper.cs`

职责：

- 初始化配置库和数据业务库
- 创建数据表、补列、执行历史迁移 SQL
- 封装实体的增删改查

常用 Mapper：

- `MetaDataMapper`
- `VideoMapper`
- `ActorMapper`
- `AppConfigMapper`
- `AppDatabaseMapper`
- `AssociationMapper`

常见改动点：

- 新增字段或关系时，先改 `Sqlite.cs`
- 然后补 `Entity`、`Mapper`、界面读取逻辑
- 如果是跨实体关系，记得检查中间表 SQL

## 4. 实体模型模块

主要目录：

- `Jvedio/Entity/Common/`
- `Jvedio/Entity/CommonSQL/`
- `Jvedio/Entity/Data/`
- `Jvedio/Entity/Base/`

职责：

- 表达视频、元数据、演员、数据库配置、搜索历史、标签等实体
- 作为扫描、下载、存储、展示之间的数据载体

核心实体：

- `Video`
- `MetaData`
- `ActorInfo`
- `AppDatabases`
- `SearchHistory`

说明：

- `Video` 是核心对象，几乎贯穿扫描、下载、数据库、UI、FFmpeg 全链路

## 5. 扫描导入模块

主要文件：

- `Jvedio/Core/Scan/ScanTask.cs`
- `Jvedio/Core/Scan/ScanHelper.cs`
- `Jvedio/Core/Scan/ScanFactory.cs`
- `Jvedio/Core/Scan/ScanResult.cs`

职责：

- 扫描目录或文件
- 过滤扩展名
- 提取识别码
- 识别并导入 NFO
- 去重、入库、记录跳过原因
- 输出扫描结果并驱动 UI 刷新

典型流程：

1. 收集扫描目录或拖入文件
2. `ScanTask.ScanDir()` 枚举文件
3. `VideoParser.ParseMovie()` 解析
4. `HandleImport()` 写入新数据
5. `HandleImportNFO()` 处理 NFO
6. `HandleNotImport()` / `HandleFailNFO()` 汇总结果

常见改动点：

- 文件名识别规则改动一般看 `ScanHelper`
- 扫描过滤规则改动一般看 `ScanTask` 和 `ScanConfig`
- 导入后的数据库写入逻辑优先检查 `Mapper`

## 6. 元数据抓取与下载模块

主要文件：

- `Jvedio/Core/Net/DownLoadTask.cs`
- `Jvedio/Core/Net/VideoDownLoader.cs`
- `Jvedio/Core/Crawler/CrawlerServer.cs`
- `Jvedio/Core/Crawler/ActorSearch.cs`

职责：

- 根据影片识别码获取站点元数据
- 下载海报、缩略图、演员头像、预览图
- 保存 NFO、演员信息、附加图像与详情字段

典型流程：

1. 为 `Video` 创建 `DownLoadTask`
2. `VideoDownLoader` 选取可用插件和站点
3. 获取详情数据字典
4. 保存影片信息
5. 下载并落盘图片
6. 刷新数据库与界面

常见改动点：

- 站点兼容性问题先看 `VideoDownLoader` 和插件返回结构
- 演员图片和海报下载问题通常集中在 `DownLoadTask`

## 7. FFmpeg 与媒体处理模块

主要文件：

- `Jvedio/Core/FFmpeg/ScreenShotTask.cs`
- `Jvedio/Core/FFmpeg/ScreenShot.cs`
- `Jvedio/Core/Media/`
- `Jvedio/Core/Tasks/ScreenShotManager.cs`

职责：

- 视频截图
- GIF 生成
- 预览图与图片缓存处理

常见改动点：

- FFmpeg 路径相关先看 `FFmpegConfig`
- 图片输出位置相关先看 `PathManager` 和 `Settings.PicPaths`

## 8. 插件模块

主要文件：

- `Jvedio/Core/Plugins/Crawler/CrawlerManager.cs`
- `Jvedio/Core/Plugins/Crawler/CrawlerInfo.cs`
- `Jvedio/Core/Config/Common/PluginConfig.cs`

职责：

- 扫描 `plugins/crawlers`
- 校验插件 DLL、`main.json`、`config.json`
- 读取启用状态
- 同步运行目录 DLL
- 启动时删除待移除插件

说明：

- 当前最核心的插件就是爬虫插件
- 插件依赖外部 `SuperControls.Style.Plugin` 体系和反射加载

调试建议：

- 插件加载失败时，先看 `plugins/crawlers/<plugin>` 目录结构是否完整
- 再看日志里是否出现 `parse plugin meta data failed`、`file not exists`、`TryLoadAssembly` 错误

## 9. UI 与 ViewModel 模块

主要目录：

- `Jvedio/ViewModels/`
- `Jvedio/Windows/`
- `Jvedio/WindowsDialog/`
- `Jvedio/Core/UserControls/`

主要窗口：

- `Window_Main`
- `Window_Details`
- `Window_Edit`
- `Window_Settings`
- `Window_DataBase`
- `Window_ScanDetail`

主要 ViewModel：

- `VieModel_Main`
- `VieModel_StartUp`
- `VieModel_Settings`
- `VieModel_Details`
- `VieModel_Edit`
- `TabItemManager`

说明：

- 许多界面行为仍在 code-behind 中
- 维护 UI 问题时不要只搜 `ViewModel`
- 常见交互入口在 `Window_Main.xaml.cs`

## 10. 升级与迁移模块

主要文件：

- `Jvedio/Upgrade/UpgradeHelper.cs`
- `Jvedio/Upgrade/Jvedio4ToJvedio5.cs`

职责：

- 处理在线升级
- 兼容旧版数据库和历史文件迁移

说明：

- 只要改到数据库结构、旧版兼容、启动迁移链路，都要复查这里

## 11. 日志与任务模块

主要文件：

- `Jvedio/Core/Logs/Logger.cs`
- `Jvedio/Core/Tasks/BaseManager.cs`
- `Jvedio/Core/Tasks/DownloadManager.cs`
- `Jvedio/Core/Tasks/ScreenShotManager.cs`
- `Jvedio/Core/UserControls/Tasks/TaskList.xaml.cs`

职责：

- 写入全局日志
- 调度下载、截图等任务队列
- 在界面显示任务状态

说明：

- 任务失败优先看日志和 `AbstractTask` 状态变化

# 常见维护场景

## 1. 新增一个配置项

建议顺序：

1. 在对应 `Config` 类中增加字段
2. 确认 `ConfigManager` 创建并保存该配置对象
3. 在设置窗口或业务入口读取/修改它
4. 如果影响数据库或路径，补充联动逻辑

## 2. 新增一个影片字段

建议顺序：

1. 修改 `Sqlite.cs` 表结构或补列 SQL
2. 更新实体类
3. 更新 Mapper 读写逻辑
4. 更新下载保存逻辑或扫描导入逻辑
5. 更新详情页/编辑页/UI 展示

## 3. 调整扫描规则

优先检查：

- `ScanTask.cs`
- `ScanHelper.cs`
- `ScanConfig`
- `Window_Main.xaml.cs` 中的触发入口

## 4. 调整站点抓取逻辑

优先检查：

- `DownLoadTask.cs`
- `VideoDownLoader.cs`
- 对应爬虫插件
- `ServerConfig`

## 5. 修改图片保存或截图逻辑

优先检查：

- `FFmpegConfig`
- `PathManager`
- `Settings.PicPaths`
- `ScreenShotTask.cs`

# 调试建议

## 1. 先看日志

优先查看：

- 程序启动日志
- 插件加载日志
- 扫描任务日志
- 下载任务日志

大多数核心流程都已经调用 `Logger` 输出关键信息。

## 2. 启动问题

排查顺序：

1. `App.OnStartup()`
2. `WindowStartUp.Window_Loaded()`
3. `MapperManager.Init()`
4. `ConfigManager.Init()`
5. `CrawlerManager.Init()`

## 3. 扫描问题

排查顺序：

1. 扫描路径是否存在
2. 扩展名是否被允许
3. 文件名或 NFO 是否能解析出识别码
4. 是否被判定为重复或不支持文件
5. 数据库是否写入成功

## 4. 下载问题

排查顺序：

1. 插件是否加载成功
2. 站点服务器配置是否可用
3. 代理与 Headers 是否正确
4. 图片地址是否为空
5. 本地路径是否可写

## 5. UI 问题

排查建议：

- 先看窗口 code-behind，再看对应 ViewModel
- 对列表、筛选、标签页问题优先看 `Window_Main`、`TabItemManager`、`Core/UserControls/`

# 维护约定

- 后续开发以 `Jvedio-WPF` 为唯一主线
- 结构性修改后同步更新本文档
- 每次仓库改动提交前同步更新根目录 `CHANGELOG.md`
- 新增模块时继续按照“职责 / 关键文件 / 常见改动点 / 调试建议”补充文档

# 常用入口文件清单

- `Jvedio/App.xaml.cs`
- `Jvedio/WindowStartUp.xaml.cs`
- `Jvedio/Core/Config/ConfigManager.cs`
- `Jvedio/Core/Config/PathManager.cs`
- `Jvedio/Mapper/MapperManager.cs`
- `Jvedio/Core/Scan/ScanTask.cs`
- `Jvedio/Core/Scan/ScanHelper.cs`
- `Jvedio/Core/Net/DownLoadTask.cs`
- `Jvedio/Core/Net/VideoDownLoader.cs`
- `Jvedio/Core/Plugins/Crawler/CrawlerManager.cs`
- `Jvedio/ViewModels/VieModel_Main.cs`
- `Jvedio/Windows/Window_Main.xaml.cs`
- `Jvedio/Upgrade/Jvedio4ToJvedio5.cs`
