# Library 页规格

## 页面定位

- Library 页展示单个媒体库下的影片内容。
- 也是扫描与抓取闭环的主要入口页。
- 本页在 renderer 中对应 `features/library/pages/LibraryPage.tsx`。

## 主要能力

- 浏览影片列表或卡片
- 排序
- 分页
- 筛选
- 进入影片详情
- 发起扫描任务
- 发起抓取任务
- 查看当前库任务进度

## 页面级组件

- `LibraryPage.tsx`
  - 只负责路由参数与页面状态同步
- `LibraryToolbar.tsx`
  - 承接扫描、抓取、刷新、任务入口
- `LibraryFilterBar.tsx`
  - 承接关键字、排序、顺序、视图切换
- `LibraryTaskBanner.tsx`
  - 展示当前库相关任务摘要
- `VideoGridView.tsx`
  - 网格视图
- `VideoListView.tsx`
  - 列表视图
- `ScanLibraryDialog.tsx`
  - 扫描确认和选项
- `ScrapeLibraryDialog.tsx`
  - 抓取确认和选项

## Section 结构

- 页面头部
  - 共享组件：
    - `PageHeader`
  - 内容：
    - 当前库名称
    - 路径摘要
    - 当前影片数量摘要
- 操作栏
  - 页面组件：
    - `LibraryToolbar.tsx`
  - 内容：
    - 扫描
    - 抓取
    - 刷新
    - 查看任务
- 筛选栏
  - 页面组件：
    - `LibraryFilterBar.tsx`
  - 内容：
    - 关键字
    - 排序
    - 顺序
    - 过滤条件
    - 网格 / 列表切换
- 内容区
  - 页面组件：
    - `VideoGridView.tsx`
    - `VideoListView.tsx`
  - 内容：
    - 影片卡片或列表
    - 空状态
    - 错误状态
- 任务提示区
  - 页面组件：
    - `LibraryTaskBanner.tsx`
  - 内容：
    - 当前任务阶段
    - 进度
    - 最近失败摘要

## 页面状态

- `libraryViewState.ts`
  - `keyword`
  - `sortBy`
  - `sortOrder`
  - `filters`
  - `viewMode`
  - `pageIndex`
- `useLibraryFilters.ts`
  - 负责 URL 与筛选状态同步
- `useLibraryPageData.ts`
  - 负责结果集、任务摘要和刷新逻辑

## API 依赖

- `GET /api/libraries`
  - 获取库摘要和导航联动所需信息
- `GET /api/libraries/{libraryId}/videos`
  - 获取影片结果集
- `POST /api/libraries/{libraryId}/scan`
  - 发起扫描
- `POST /api/libraries/{libraryId}/scrape`
  - 发起抓取
- `GET /api/tasks`
  - 获取当前库任务摘要
- `GET /api/events`
  - 订阅扫描、抓取和资源变更事件

## 第二阶段重点

- 配置默认扫描目录后能发起扫描。
- 命中影片后整理、抓取与输出结果可反馈到当前库视图。
- 未命中影片必须有明确报告。

## 第二批实现边界

- 本批要完成：
  - 结果集加载
  - URL 同步筛选
  - 扫描入口
  - 抓取入口
  - 任务摘要回填
- 本批不进入：
  - 高级批量编辑
  - 多库联合视图
  - 收藏 / 智能分类高级联动

## 数据来源

- 当前来源：
  - 主窗口列表页与库切换相关逻辑
- 目标来源：
  - Worker `libraries / tasks / events` API
