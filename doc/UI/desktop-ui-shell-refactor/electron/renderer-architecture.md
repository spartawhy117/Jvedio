# Renderer 真实目录与组件拆分草案

## 目标

- 把 renderer 从“按页面命名的抽象草图”推进到“可直接开工建目录”的粒度。
- 让页面、共享组件、数据访问、事件订阅和路由壳层的边界先固定下来，避免实现期反复挪目录。
- 保持 Jvedio 自己的业务模型，不照搬 `jellyfin-web` 的术语层，也不把 `fntv-electron` 误用为 renderer 模板。

## 参考落点

- `fntv-electron`
  - 提供 `main / preload / modules` 的进程分层参考
  - 不提供 Jvedio renderer 目录模板
- `jellyfin-web`
  - 提供 `apps / components / hooks / types / utils` 的页面工程拆分参考
  - 其 `controllers / elements` 术语过重，不直接照搬到 Jvedio

## 收敛后的目录原则

- `app`
  - 只放应用壳层、全局 provider、路由和导航拼装
- `features`
  - 每个一级页面或横切业务单独成 feature，自带页面、局部组件、局部 hook、局部状态
- `components`
  - 只放跨 feature 复用的纯 UI 组件，不直接请求 Worker API
- `api`
  - 只放 HTTP/SSE 的访问层、DTO 和请求封装
- `hooks`
  - 只放跨 feature 可复用的 hook，不放具体页面业务规则
- `types` / `utils`
  - 放全局共享类型和纯函数工具，不掺杂 UI 副作用

## 推荐真实目录

```text
renderer/
  package.json
  tsconfig.json
  vite.config.ts
  src/
    app/
      bootstrap/
        createApp.tsx
        registerErrorHandling.ts
        registerTheme.ts
      layout/
        AppShell.tsx
        AppTitleBar.tsx
        AppSidebar.tsx
        AppMainContent.tsx
      navigation/
        staticNavItems.ts
        useLibraryNavItems.ts
      providers/
        AppProviders.tsx
        DataClientProvider.tsx
        TaskEventProvider.tsx
        ToastProvider.tsx
      routes/
        index.tsx
        routeMap.tsx
        routeParams.ts
    api/
      client/
        httpClient.ts
        apiEnvelope.ts
        problemDetails.ts
      app/
        getBootstrap.ts
      libraries/
        createLibrary.ts
        deleteLibrary.ts
        getLibraries.ts
        getLibraryDetail.ts
        getLibraryVideos.ts
        saveLibraryScanPaths.ts
        startLibraryScan.ts
        startLibraryScrape.ts
      actors/
        getActors.ts
        getActorVideos.ts
      videos/
        getVideoDetail.ts
        openVideoFolder.ts
        playVideo.ts
        refreshVideoMetadata.ts
      settings/
        getSettings.ts
        saveSettings.ts
        runMetaTubeDiagnostics.ts
      tasks/
        getTasks.ts
        getTaskDetail.ts
        cancelTask.ts
        subscribeTaskEvents.ts
    features/
      home/
        pages/
          HomePage.tsx
        sections/
          HomeSummarySection.tsx
          HomeLibrarySection.tsx
          HomeQuickActionsSection.tsx
        components/
          LibrarySummaryCard.tsx
          RecentTaskList.tsx
        dialogs/
          CreateLibraryDialog.tsx
          DeleteLibraryDialog.tsx
        hooks/
          useHomePageData.ts
      library/
        pages/
          LibraryPage.tsx
        components/
          LibraryToolbar.tsx
          LibraryFilterBar.tsx
          LibraryTaskBanner.tsx
          VideoGridView.tsx
          VideoListView.tsx
        dialogs/
          ScanLibraryDialog.tsx
          ScrapeLibraryDialog.tsx
        hooks/
          useLibraryFilters.ts
          useLibraryPageData.ts
        state/
          libraryViewState.ts
      actors/
        pages/
          ActorsPage.tsx
        components/
          ActorsToolbar.tsx
          ActorGrid.tsx
          ActorList.tsx
          ActorVideoDrawer.tsx
        hooks/
          useActorsFilters.ts
      video-detail/
        pages/
          VideoDetailPage.tsx
        sections/
          VideoHeroSection.tsx
          VideoMetadataSection.tsx
          VideoAssetsSection.tsx
          VideoActorsSection.tsx
        components/
          VideoActionBar.tsx
          SidecarStatusCard.tsx
        hooks/
          useVideoDetailData.ts
      settings/
        pages/
          SettingsPage.tsx
        components/
          SettingsGroupList.tsx
          SettingsSectionForm.tsx
          SettingsSaveBar.tsx
          MetaTubeDiagnosticsPanel.tsx
        hooks/
          useSettingsForm.ts
      favorites/
        pages/
          FavoritesPage.tsx
      tasks/
        components/
          TaskDrawer.tsx
          TaskList.tsx
          TaskProgressCard.tsx
        hooks/
          useTaskFeed.ts
    components/
      shell/
        PageHeader.tsx
        SectionCard.tsx
      navigation/
        NavMenu.tsx
        NavMenuItem.tsx
      media/
        VideoCard.tsx
        VideoPoster.tsx
        AssetStatusBadge.tsx
      entities/
        LibraryRow.tsx
        ActorCard.tsx
        MetadataFieldList.tsx
      forms/
        SearchInput.tsx
        SortSelect.tsx
        ViewModeToggle.tsx
      feedback/
        EmptyState.tsx
        ErrorState.tsx
        LoadingState.tsx
        InlineNotice.tsx
      tasks/
        TaskStatusChip.tsx
        TaskProgressBar.tsx
    hooks/
      useDebouncedValue.ts
      useEventSource.ts
      usePagedQueryState.ts
      usePersistedViewMode.ts
    styles/
      tokens.css
      index.css
    types/
      app.ts
      library.ts
      video.ts
      actor.ts
      settings.ts
      task.ts
    utils/
      date.ts
      fileSize.ts
      path.ts
      queryString.ts
```

## 一级目录职责

### `app`

- 只负责“把页面挂起来”，不承担页面自己的业务拼装。
- `AppShell.tsx`
  - 只做布局骨架和槽位分发
- `TaskEventProvider.tsx`
  - 维护全局唯一 SSE 连接
  - 负责重连、心跳和事件广播
- `routeMap.tsx`
  - 维护页面路由和壳层挂载关系

### `api`

- 每个文件只做一个动作，避免 `librariesApi.ts` 这种大而全入口。
- 请求函数命名统一为动词开头：
  - `getLibraries`
  - `startLibraryScan`
  - `refreshVideoMetadata`
- DTO 和 envelope 放在 `client/`，避免分散在各 feature 内重复定义。

### `features`

- 一级导航页面单独成 feature。
- 同一 feature 内优先分为：
  - `pages`
  - `sections`
  - `components`
  - `dialogs`
  - `hooks`
  - `state`
- 只有被第二个 feature 复用时，才提升到 `src/components/`。

### `components`

- 共享组件只吃 props，不直接知道 API 地址、路由结构或 Worker 任务状态来源。
- UI 基础组件保持按语义分组：
  - `shell`
  - `navigation`
  - `media`
  - `entities`
  - `forms`
  - `feedback`
  - `tasks`

## 页面级组件拆分

### Home

- `HomePage.tsx`
  - 只负责拼接三块 section 和页面级 loading / error
- `HomeSummarySection.tsx`
  - 展示库总数、扫描路径状态、最近任务摘要
- `HomeLibrarySection.tsx`
  - 承接库列表、打开库、编辑、删除入口
- `HomeQuickActionsSection.tsx`
  - 放“新建库”“打开默认扫描目录”“查看失败任务”
- `CreateLibraryDialog.tsx`
  - 只处理建库表单，不掺杂列表刷新逻辑

### Library

- `LibraryPage.tsx`
  - 只负责路由参数与页面状态同步
- `LibraryToolbar.tsx`
  - 放扫描、抓取、刷新、任务入口
- `LibraryFilterBar.tsx`
  - 放关键字、排序、顺序、视图切换
- `VideoGridView.tsx` / `VideoListView.tsx`
  - 视图切换落在组件边界，不把条件分支塞回 `LibraryPage.tsx`
- `LibraryTaskBanner.tsx`
  - 只订阅当前库相关任务摘要

### Actors

- `ActorsPage.tsx`
  - 管查询参数和分页状态
- `ActorsToolbar.tsx`
  - 承接搜索、排序、首字母 / 拼音筛选
- `ActorGrid.tsx` / `ActorList.tsx`
  - 分别承接卡片和列表视图
- `ActorVideoDrawer.tsx`
  - 第一期先做右侧抽屉，不急着做独立演员详情页

### Video Detail

- `VideoDetailPage.tsx`
  - 只做数据拼装和错误边界
- `VideoHeroSection.tsx`
  - 标题、番号、评分、年份、主图
- `VideoActionBar.tsx`
  - 播放、打开目录、手动刷新
- `VideoMetadataSection.tsx`
  - 纯键值信息区
- `VideoAssetsSection.tsx`
  - poster / thumb / fanart / sidecar 状态

### Settings

- `SettingsPage.tsx`
  - 只管理当前分组和保存状态
- `SettingsGroupList.tsx`
  - 左侧设置分组导航
- `SettingsSectionForm.tsx`
  - 单分组表单容器
- `SettingsSaveBar.tsx`
  - 统一承接保存、重置和 dirty 状态
- `MetaTubeDiagnosticsPanel.tsx`
  - 单独承接连通性测试与诊断输出

## 数据与状态边界

- 服务端状态
  - 通过 `api/*` + feature hook 获取
  - 不在共享组件里发请求
- 页面视图状态
  - 放 feature 自己的 `state/`
  - 例如 `libraryViewState.ts`
- 全局横切状态
  - 仅保留主题、导航展开、任务流摘要这类壳层状态
- SSE 事件状态
  - 统一由 `TaskEventProvider.tsx` 接入
  - 再由 `features/tasks` 和各页面 hook 消费

## 依赖约束

- `app` 可以依赖：
  - `features`
  - `components`
  - `api`
  - `hooks`
  - `types`
  - `utils`
- `features` 可以依赖：
  - `components`
  - `api`
  - `hooks`
  - `types`
  - `utils`
- `components` 不可依赖：
  - `features/*`
- `api` 不可依赖：
  - `features/*`
  - `components/*`
- feature 之间不允许直接引用彼此内部文件，只能通过共享组件或共享 hook 间接复用

## 第一批建议落地顺序

1. 先建 `app/`、`api/client/`、`features/home/`、`features/library/` 的空目录和页面壳。
2. 再补 `components/shell/`、`components/feedback/` 和 `components/tasks/`，形成基础骨架。
3. 随后接入 `api/libraries/*`、`api/tasks/*` 和 `TaskEventProvider.tsx`，完成 Home / Library 的最小闭环。
4. 最后再推进 `actors`、`video-detail`、`settings` 三个 feature，避免一开始就把共享组件抽象过度。
