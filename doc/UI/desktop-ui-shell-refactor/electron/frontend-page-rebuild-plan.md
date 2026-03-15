# Jvedio 前端页面重构计划

## 目标

- 保留当前已确认的 Jvedio 页面结构和业务职责。
- 使用“双参考源”缩短前端页面实现路径。
- 让后续实现阶段能直接按页面、组件和数据层拆分工作，而不是继续停留在抽象讨论。

## 参考策略

### 主结论

- `fntv-electron`
  - 只负责桌面壳层参考
- `jellyfin-web`
  - 只负责页面级实现参考

### 参考分工

- `fntv-electron` 参考：
  - 无边框窗口
  - 自定义标题栏
  - 托盘
  - 窗口关闭 / 最小化策略
  - 桌面应用交互感
  - 外部播放器调起入口体验
- `jellyfin-web` 参考：
  - 路由壳层
  - 页面分区
  - 列表 / 网格视图
  - 搜索、筛选、排序
  - 详情页信息编排
  - 设置页分组导航
  - 页面级数据 hook 组织方式

### 明确不做

- 不把 `jellyfin-web` 作为完整工程模板。
- 不把 `fntv-electron` 作为页面实现模板。
- 不直接复用任一参考仓库的代码、样式资产或品牌资源。

## Jvedio 保持不变的产品结构

- 左导航仍然保持：
  - Home
  - Favorites
  - Actors
  - 智能分类
    - 类别
    - 系列
  - Libraries
  - Settings 作为壳层入口
- 页面职责仍然保持：
  - Home
    - 媒体库管理中心
  - Library
    - 单库浏览、筛选、扫描与抓取入口
  - Actors
    - 演员聚合页
  - Video Detail
    - 影片详情与播放入口
  - Settings
    - 现有配置能力承接

## 推荐实现结构

- `Electron main`
  - 应用生命周期
  - 主窗口
  - 托盘
  - Worker 拉起与关闭
  - 外部播放器调用桥接
- `Electron preload`
  - 安全暴露有限 IPC
  - 不注入业务 DOM
- `renderer`
  - 页面 UI
  - 路由
  - API hooks
  - 任务事件订阅
- `C# Worker`
  - libraries
  - scan
  - scrape
  - metadata
  - settings
  - play
  - task events

## 推荐前端目录草案

```text
renderer/
  src/
    app/
      routes/
      layout/
      providers/
    features/
      home/
      library/
      actors/
      video-detail/
      settings/
      favorites/
      tasks/
    components/
      shell/
      lists/
      cards/
      forms/
      feedback/
    hooks/
      useLibraries.ts
      useLibraryVideos.ts
      useActors.ts
      useVideoDetail.ts
      useSettings.ts
      useTasks.ts
    types/
    utils/
```

## 页面级重构方案

### 1. Home

#### 页面定位

- Home 继续承接旧 `WindowStartUp` 的库管理能力。
- 不改成 Jellyfin 的内容推荐首页。

#### 参考来源

- 结构参考：
  - `jellyfin-web` 的首页 section 组合思路
- 桌面感参考：
  - `fntv-electron` 的客户端壳节奏

#### 目标页面分区

- 页面头部
  - 标题
  - 新建库按钮
  - 全局任务入口
- 库摘要区
  - 库总数
  - 扫描路径状态摘要
  - 最近任务摘要
- 库列表区
  - 每个库一行或卡片
  - 进入库
  - 编辑
  - 删除
- 快捷操作区
  - 新建库
  - 打开默认扫描目录
  - 查看最近失败任务

#### 第一批实现重点

- 新建库
- 删除库
- 打开库
- 查看库状态摘要

### 2. Library

#### 页面定位

- Library 是第一期最核心的内容页。
- 应优先吸收 `jellyfin-web` 的列表页组织方式。

#### 参考来源

- 主参考：
  - `jellyfin-web` 的 `LibraryViewSettings`、列表 / 网格切换、筛选 / 排序 / 分页建模

#### 目标页面分区

- 顶部标题区
  - 当前库名称
  - 当前扫描路径摘要
- 操作栏
  - 扫描
  - 抓取
  - 刷新
  - 查看任务
- 筛选栏
  - 关键字
  - 排序
  - 顺序
  - 过滤条件
  - 网格 / 列表切换
- 内容区
  - 影片网格
  - 或列表视图
- 状态区
  - 加载中
  - 空状态
  - 错误状态
  - 当前任务进度

#### 实现原则

- 页面状态对象化，不把筛选条件散落在多个局部 state 中。
- 筛选条件与 URL 同步。
- 扫描与抓取状态通过 SSE 或轮询任务状态回填。

### 3. Actors

#### 页面定位

- Actors 是 Jvedio 保留的一级重点导航，不降级为附属页。

#### 参考来源

- 主参考：
  - `jellyfin-web` 的 artists / people 类聚合列表思路

#### 目标页面分区

- 页面头部
  - 标题
  - 搜索框
- 控制栏
  - 排序
  - 首字母 / 拼音索引
  - 列表 / 卡片切换
- 演员结果区
  - 头像
  - 名称
  - 作品数
- 右侧或下钻详情
  - 演员关联影片列表

#### 第一批实现重点

- 搜索
- 排序
- 演员卡片列表
- 进入演员关联影片结果

### 4. Video Detail

#### 页面定位

- 承接当前详情页语义，但界面结构按 Web 页面重构。

#### 参考来源

- 主参考：
  - `jellyfin-web` 详情页的信息分区方式
- 次参考：
  - `fntv-electron` 的播放入口桌面化体验

#### 目标页面分区

- Hero 区
  - 标题
  - 番号
  - 评分 / 年份 / 时长
  - 主图
- 主要操作区
  - 播放
  - 打开文件位置
  - 手动刷新元数据
- 元数据区
  - 标题
  - 系列
  - 类别
  - 标签
  - 文件路径
- 人物区
  - 演员列表
- 媒体区
  - poster / thumb / fanart 状态
  - sidecar 状态

#### 第一批实现重点

- 基础详情展示
- 播放入口
- 打开目录
- 手动刷新元数据

### 5. Settings

#### 页面定位

- Settings 不再维持一个超长表单页。
- 第一层做分组目录，第二层进入具体设置面板。

#### 参考来源

- 主参考：
  - `jellyfin-web` 设置页的 section list 模式

#### 目标页面分组

- General
  - 语言
  - 主题
- Libraries
  - 默认扫描目录
  - 扫描行为
- MetaTube
  - 服务地址
  - 测试番号
  - 连接与诊断
- Playback
  - 外部播放器路径
  - 播放回退策略
- Data
  - cache
  - sidecar
  - 日志入口

#### 第一批实现重点

- General
- MetaTube
- Playback

## 共享组件重构清单

- `AppShell`
  - 左导航 + 顶栏 + 内容区
- `SideNav`
  - 固定导航与 Libraries 动态列表
- `PageHeader`
  - 标题、副标题、右侧动作
- `FilterBar`
  - 搜索、筛选、排序、视图切换
- `MediaGrid`
  - 视频卡片网格
- `EntityList`
  - 演员 / 库 / 设置条目列表
- `TaskStatusPanel`
  - 当前任务进度与最近失败任务
- `DetailHero`
  - 详情页主信息区
- `MetadataSection`
  - 键值信息块
- `EmptyState`
  - 无数据提示
- `ErrorState`
  - 加载失败提示

## 页面状态建模建议

- `HomeState`
  - libraries
  - recentTasks
  - summary
- `LibraryViewState`
  - keyword
  - sortBy
  - sortOrder
  - filters
  - viewMode
  - pageIndex
- `ActorsViewState`
  - keyword
  - sortBy
  - alphabet
  - viewMode
  - pageIndex
- `VideoDetailState`
  - detail
  - playAvailability
  - assetState
- `SettingsState`
  - grouped settings
  - dirty flags
  - save status

## 对 Worker API 的前端要求

- `/api/app/bootstrap`
  - 获取全局初始状态
- `/api/libraries`
  - Home / SideNav / Library 通用
- `/api/libraries/{id}/videos`
  - Library 结果集
- `/api/libraries/{id}/scan`
  - 扫描动作
- `/api/libraries/{id}/scrape`
  - 抓取动作
- `/api/actors`
  - Actors 聚合
- `/api/videos/{id}`
  - Detail
- `/api/videos/{id}/play`
  - 播放入口
- `/api/settings`
  - Settings
- `/api/events`
  - 任务与状态事件

## 建议实施顺序

### 阶段 1

- 壳层基础
  - Electron main
  - renderer 路由壳
  - preload 最小桥接

### 阶段 2

- 页面公共层
  - AppShell
  - SideNav
  - PageHeader
  - Empty / Error / Loading
  - API hooks 基础层

### 阶段 3

- Home 页最小闭环
  - 库新增 / 删除 / 打开

### 阶段 4

- Library 页最小闭环
  - 列表
  - 筛选
  - 扫描入口

### 阶段 5

- Actors 与 Video Detail

### 阶段 6

- Settings

## 当前文档产出结论

- 参考源现已固定为“双参考源”。
- `fntv-electron` 不再承载页面级模板角色。
- `jellyfin-web` 不再被视为完整工程模板，而是页面实现参考。
- Jvedio 的页面结构和业务边界保持原计划不变，但实现路径已经被收敛到可落地层面。
