# `jellyfin-web` 首轮源码审计

## 审计目标

- 判断 `jellyfin/jellyfin-web` 是否适合作为 Jvedio 的页面级参考源。
- 提炼对 Jvedio 真正有价值的页面组织、数据抓取和页面分层思路。
- 明确哪些内容可以借鉴，哪些内容会把 Jvedio 的前端实现拖重。

## 审计样本

- 本地路径：
  - `D:\study\Proj\jellyfin-web`
- 审计分支：
  - `master`
- 审计提交：
  - `e6fe869a3b94fef35811bcd8ea4a9c0a713979b6`
- 版本声明：
  - `package.json` 中为 `10.12.0`
- 许可证：
  - `GPL-2.0-or-later`

## 结构观察

### 仓库形态

- 这是一个成熟的大型 Web 前端仓库，不是桌面壳项目。
- 当前技术栈重点包括：
  - `React 18`
  - `TypeScript`
  - `react-router-dom`
  - `@tanstack/react-query`
  - `MUI`
- 目录结构已经进入新旧并存阶段：
  - `src/apps/*`
    - 新结构入口
  - `src/hooks/*`
    - API 查询与状态 hooks
  - `src/components/*`
    - 公共可视组件与旧组件
  - `src/controllers/*`
    - README 已明确标记为 legacy

### 运行组织方式

- `src/apps/stable/routes/routes.tsx` 使用嵌套路由承载稳定版应用。
- `AppLayout.tsx` 提供统一壳层，再通过子路由渲染页面内容。
- 新路由和旧视图同时存在：
  - async routes
  - legacy routes
  - `ViewManagerPage` 负责兼容旧视图控制器

### 状态与数据层

- `hooks/useUserViews.ts`
  - 负责获取用户媒体库视图
- `hooks/useItem.ts`
  - 负责单项详情拉取
- `hooks/useFetchItems.ts`
  - 负责列表、推荐、过滤、排序、分页、section 数据拉取
- 其核心特点是：
  - 按领域组织 hook
  - 页面不直接散落写请求
  - 查询参数被系统化建模

## 对 Jvedio 有用的内容

### 1. 路由与页面壳分层

- `routes.tsx` + `AppLayout.tsx` 的组合值得参考。
- 对 Jvedio 的价值在于：
  - 先定义主壳
  - 再把各页面作为子路由挂到壳内
  - 页面级逻辑不混进窗口生命周期

审计结论：

- 这部分非常适合 Jvedio 的 `renderer`。
- 但不需要照搬 Jellyfin 的多 app、多兼容层结构。

### 2. 页面级数据 hook 分层

- `useUserViews.ts`
- `useItem.ts`
- `useFetchItems.ts`

审计结论：

- 这是 `jellyfin-web` 最值得借鉴的部分之一。
- 对 Jvedio 的直接启发是：
  - `useLibraries`
  - `useLibraryVideos`
  - `useActors`
  - `useVideoDetail`
  - `useTasks`
  - `useSettings`
  这类 hook 应按业务域拆，而不是在页面里直接堆 API 调用。

### 3. 首页 section 组合思路

- `components/homesections/homesections.js`
- `types/homeSectionType.ts`

审计结论：

- Jellyfin 的首页不是单块页面，而是“多个 section 拼装”。
- 这对 Jvedio 的价值不在于照搬其“继续观看 / 最新加入”业务，而在于：
  - 页面由多个稳定 section 组成
  - section 可以独立拉数
  - section 可以按用户/配置控制显隐顺序

对 Jvedio 的启发：

- Home 页可拆成：
  - LibrariesSummarySection
  - RecentTasksSection
  - LibraryActionsSection
  - QuickEntrySection
- Library 页可拆成：
  - FilterBarSection
  - ResultViewSection
  - TaskStatusSection

### 4. 列表页的视图配置建模

- `types/library.ts`
- `types/libraryTab.ts`
- `types/libraryTabContent.ts`

审计结论：

- Jellyfin 把列表页常见变量统一建模为：
  - 排序
  - 排序方向
  - 起始索引
  - 视图模式
  - 图片类型
  - 显示标题
  - 多种过滤条件
- 这类“列表视图状态对象”非常适合 Jvedio Library / Actors 页。

### 5. 搜索页的 URL 状态同步

- `apps/stable/routes/search.tsx`
- `hooks/useSearchParam.ts`

审计结论：

- 查询字符串进入 URL，而不是只存在组件 state 中，这一点值得借鉴。
- 对 Jvedio 的价值：
  - Library 页筛选条件可回放
  - Actors 页搜索状态可分享 / 可恢复
  - 详情页返回列表时能保留上下文

### 6. 设置页的信息架构

- `apps/stable/routes/user/settings/index.tsx`

审计结论：

- 这个页面虽然面向 Jellyfin 用户设置，但其组织方式值得借鉴：
  - 分 section
  - 每项是可进入的设置条目
  - 避免一个超长表单页直接堆满
- 对 Jvedio 的启发：
  - Settings 第一层做“设置分组入口”
  - 第二层再进入具体配置面板

## 对 Jvedio 不应直接采用的内容

### 1. 整体工程体量

- `jellyfin-web` 是长期演化的大型项目。
- 包含：
  - 新旧结构并存
  - 电视端兼容
  - 多媒体类型全面覆盖
  - 管理后台与普通用户前端并存

审计结论：

- Jvedio 不应复制它的全量结构。
- 否则会在第一期引入远大于当前目标的复杂度。

### 2. legacy controller 兼容层

- `controllers/*`
- `ViewManagerPage.tsx`

审计结论：

- 这是 Jellyfin 历史包袱的一部分。
- 对 Jvedio 没有正向价值，不应模仿。

### 3. 依赖与设计系统重量

- `MUI`
- `material-react-table`
- 大量 legacy components / webcomponents

审计结论：

- Jvedio 当前不需要复刻整套设计系统。
- 只需要吸收其页面分层和交互结构，不需要复制组件栈。

### 4. 服务端强耦合建模

- `@jellyfin/sdk`
- 大量以 Jellyfin 领域模型为核心的 hook 和类型

审计结论：

- 这些模型对 Jvedio 不可直接复用。
- Jvedio 应围绕自身 Worker API 和 MetaTube/扫描链重新建模。

## 对 Jvedio 五个核心页面的直接启发

### Home

- 不借鉴 Jellyfin 的业务内容。
- 借鉴：
  - section 组合方式
  - 首页块级编排
  - 空状态与快捷入口布局

### Library

- 这是最值得借鉴 Jellyfin 的页面。
- 借鉴：
  - `LibraryViewSettings` 这类统一视图状态对象
  - 列表 / 网格切换
  - 筛选、排序、分页状态收敛
  - URL 同步查询条件

### Actors

- 借鉴其 `Artists/People` 类列表页思路。
- 重点是：
  - 搜索
  - 排序
  - 头像卡片网格
  - 列表到详情聚合跳转

### Video Detail

- 可借鉴 Jellyfin 的详情页内容分区逻辑：
  - 顶部主信息区
  - 主要操作区
  - 元数据区
  - 关联人物区
  - 相关内容区
- 不借鉴其服务端驱动的媒体类型细分复杂度。

### Settings

- 借鉴：
  - 分组入口式设置页
  - 分层导航而不是超长单页
- 不借鉴：
  - 多服务器、多用户、多端能力相关分组

## 与 `fntv-electron` 的互补关系

### `jellyfin-web` 负责提供

- 页面级组织参考
- 路由分层参考
- 列表 / 详情 / 搜索 / 设置页结构参考
- 数据 hook 与视图状态建模参考

### `fntv-electron` 负责提供

- Electron 壳层参考
- 窗口 / 托盘 / 标题栏 / 生命周期参考
- 本地播放器调起体验参考
- 桌面客户端交互感参考

## 对 Jvedio 的最终建议

- 把 `jellyfin-web` 作为页面实现参考源。
- 把 `fntv-electron` 作为桌面壳参考源。
- 保留 Jvedio 既定页面结构，不切换成 Jellyfin 的产品定义。

## 审计结论摘要

- `jellyfin-web` 值得参考，但只能按“页面结构与数据分层”去借鉴。
- 它不适合作为 Jvedio 的完整工程模板。
- 它最有价值的内容是：
  - 路由壳层
  - hook 分层
  - section 组合
  - 列表视图状态建模
  - 设置页分组结构
