# Home 页规格

## 页面定位

- Home 是媒体库管理页，不是封面墙首页。
- 本页承接旧 `WindowStartUp` 的媒体库 CRUD 与打开动作。
- 本页在 renderer 中对应 `features/home/pages/HomePage.tsx`。

## 主要能力

- 新建库
- 删除库
- 重命名库
- 打开库
- 查看库基础状态
- 进入库扫描路径编辑入口
- 查看最近任务摘要
- 打开默认扫描目录

## 页面级组件

- `HomePage.tsx`
  - 只负责拼接 section、处理页面级 loading / error、接入路由动作
- `HomeSummarySection.tsx`
  - 展示库总数、扫描路径状态、最近任务摘要
- `HomeLibrarySection.tsx`
  - 展示库列表、打开库、重命名、删除入口
- `HomeQuickActionsSection.tsx`
  - 展示“新建库”“打开默认扫描目录”“查看失败任务”
- `LibrarySummaryCard.tsx`
  - 单库摘要卡片
- `RecentTaskList.tsx`
  - 最近任务摘要列表
- `CreateLibraryDialog.tsx`
  - 新建库表单
- `DeleteLibraryDialog.tsx`
  - 删除确认

## Section 结构

- 页面头部
  - 共享组件：
    - `PageHeader`
  - 内容：
    - 页面标题
    - 副标题
    - 新建库按钮
- 摘要区
  - 页面组件：
    - `HomeSummarySection.tsx`
  - 内容：
    - 库总数
    - 扫描路径状态摘要
    - 最近运行任务数
    - 最近失败任务数
- 库列表区
  - 页面组件：
    - `HomeLibrarySection.tsx`
  - 内容：
    - 库名
    - 路径摘要
    - 状态摘要
    - 打开
    - 编辑
    - 删除
- 快捷操作区
  - 页面组件：
    - `HomeQuickActionsSection.tsx`
  - 内容：
    - 新建库
    - 打开默认扫描目录
    - 查看失败任务

## 页面状态

- `useHomePageData.ts`
  - 负责拉取：
    - bootstrap
    - libraries
    - tasks summary
- `HomeState`
  - `libraries`
  - `summary`
  - `recentTasks`
  - `isCreateDialogOpen`
  - `pendingDeleteLibraryId`
  - `isLoading`
  - `error`

## API 依赖

- `GET /api/app/bootstrap`
  - 获取首页初始摘要和任务汇总
- `GET /api/libraries`
  - 获取库列表
- `POST /api/libraries`
  - 新建库
- `DELETE /api/libraries/{libraryId}`
  - 删除库
- `GET /api/tasks`
  - 获取最近任务摘要
- `GET /api/events`
  - 订阅库变更和任务变更事件

## 第一阶段重点

- 先完成新建和删除闭环。
- 打开库后能正确联动左侧导航和 Library 路由。
- 不在本页扩展复杂封面管理。
- 不在本页承接扫描任务详情展示，任务详情另由任务中心或 Library 页承接。

## 第一批实现边界

- 本批要完成：
  - 首页加载库列表
  - 新建库
  - 删除库
  - 打开库
  - 首页任务摘要
- 本批不进入：
  - 扫描路径编辑明细
  - 扫描与抓取执行
  - 复杂封面和统计图表

## 数据来源

- 当前来源：
  - `WindowStartUp`
  - 当前库配置与数据库记录
- 目标来源：
  - Worker `bootstrap / libraries / tasks` API
