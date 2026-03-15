# Desktop UI Shell Refactor Implementation Steps

## Step 1. Land documentation and tracking structure

- Goal:
  - 完成 Electron 路线的方案文档、会话 handoff、验证矩阵和参考说明。
- Involved modules:
  - `plan/active/desktop-ui-shell-refactor/`
  - `doc/UI/desktop-ui-shell-refactor/electron/`
  - `doc/UI/desktop-ui-shell-refactor/reference/`
- Risks:
  - 旧 WPF 路线与新 Electron 路线并存，导致后续实施入口混乱。
- Validation:
  - 新会话默认只读 `handoff.md` 即可恢复上下文。
- Exit condition:
  - 文档结构稳定，Release 构建通过。

## Step 2. Pull and audit `fntv-electron`

- Goal:
  - 将 `fntv-electron` 拉取到 `D:\study\Proj\fntv-electron`，形成可持续参考的本地仓库。
- Involved modules:
  - local reference repo only
  - `doc/UI/desktop-ui-shell-refactor/reference/`
- Risks:
  - 借鉴范围不清，导致误把远程访问或 MPV 深度能力带入第一阶段。
- Validation:
  - 输出页面借鉴清单、交互借鉴清单和明确排除项。
- Exit condition:
  - `fntv-electron-notes.md` 补充到可指导页面实现的粒度。

## Step 3. Freeze Electron page specs and bridge draft

- Goal:
  - 锁定 Electron 页面规格和 Worker API 草案。
- Involved modules:
  - `electron/page-home.md`
  - `electron/page-library.md`
  - `electron/page-actors.md`
  - `electron/page-video-detail.md`
  - `electron/page-settings.md`
  - `electron/backend-bridge.md`
- Risks:
  - 页面职责、API 分组和事件流未锁定，后续实现反复返工。
- Validation:
  - 页面规格能直接指导 UI 搭建和接口定义。
- Exit condition:
  - 第一阶段页面和 API 草案无阻塞问题。

## Step 4. Implement batch 1: library create/delete

- Goal:
  - 完成 Home 页的库新建与删除最小闭环。
- Involved modules:
  - Electron Home page
  - Worker libraries API
  - current library persistence logic
- Risks:
  - 旧 `WindowStartUp` 逻辑迁移不完整。
- Validation:
  - 跟随 `validation.md` 的第一批用例。
- Exit condition:
  - 库新建、删除、左侧导航同步全部可用。

## Step 5. Implement batch 2: scan path, scan, scrape

- Goal:
  - 完成库默认扫描目录、扫描、MetaTube 抓取与输出闭环。
- Involved modules:
  - Electron Library page
  - Worker scan and scrape APIs
  - existing MetaTube and scan chain
- Risks:
  - 长任务状态、失败反馈与整理结果不一致。
- Validation:
  - 跟随 `validation.md` 的第二批用例。
- Exit condition:
  - 扫描路径、扫描、整理、抓取和输出都可验证。

## Step 6. Implement batch 3: video display and play

- Goal:
  - 完成影片展示、详情和外部播放器调用闭环。
- Involved modules:
  - Electron Library page
  - Electron Video Detail page
  - current external player chain
- Risks:
  - 播放链路与现有设置项脱节。
- Validation:
  - 跟随 `validation.md` 的第三批用例。
- Exit condition:
  - 影片展示和播放能力稳定可回归。

## Step 7. Implement batch 4: settings

- Goal:
  - 完成设置入口、设置页面和现有设置能力接入。
- Involved modules:
  - Electron Settings page
  - Worker settings APIs
  - current config persistence logic
- Risks:
  - 配置保存、回读和应用行为回归。
- Validation:
  - 跟随 `validation.md` 的第四批用例。
- Exit condition:
  - 设置页面功能完好。

## Step 8. Implement actor detail page in content area

- Goal:
  - 将当前演员抽屉升级为右侧内容区独立详情页，并补齐到影片详情页的上下钻闭环。
- Involved modules:
  - Electron Actors page
  - Electron Actor Detail route
  - Worker actors APIs
  - existing video detail route
- Risks:
  - 返回链路处理不好会导致筛选、分页、选中状态丢失。
- Validation:
  - 受影响的 Electron actors 聚焦回归 + Release 构建。
- Exit condition:
  - `Actors -> Actor Detail -> Video Detail` 稳定可回归，且不需要新窗口。

当前状态：

- 已完成。Actors 列表现已跳转到 `#/actors/{actorId}`，影片详情可通过 `backTo` 返回演员详情。

## Step 9. Align settings tabs to current shell scope

- Goal:
  - 让 Settings 页签数量与当前既有设置页一致，并按当前已有开关 / 输入项完成第一轮结构对齐。
- Involved modules:
  - Electron Settings page
  - Worker settings APIs
  - current config persistence logic
- Risks:
  - 页签快速扩展时容易引入只展示不消费或只消费不展示的不一致。
- Validation:
  - 受影响的 Electron settings 聚焦回归 + Release 构建。
- Exit condition:
  - 页签数量对齐，已有开关有可见承载，本轮不做细节打磨。

当前状态：

- 已完成。Electron Settings 已扩展到 `Basic / Picture / Scan & Import / Network / Library / MetaTube` 6 个页签；真正落库项仍集中在 `Basic / MetaTube`。

## Step 10. Implement Favorites page

- Goal:
  - 补齐 Favorites 一级导航页的最小壳、结果集和与统一影片卡片的衔接。
- Involved modules:
  - Electron Favorites route
  - Worker favorites query APIs if needed
  - shared video card rendering
- Risks:
  - 如果直接复制 Library 结果集实现，会让影片卡片继续分叉。
- Validation:
  - 受影响的 Electron Favorites 聚焦回归 + Release 构建。
- Exit condition:
  - Favorites 路由、结果集、跳到影片详情和返回链路可用。

## Step 11. Implement smart categories: category and series

- Goal:
  - 完成智能分类中的“类别”和“系列”两个页面最小闭环。
- Involved modules:
  - Electron smart category routes
  - Worker grouped query APIs
  - shared video card rendering
- Risks:
  - 分组查询、空状态和筛选状态如果各自实现，后续维护成本会明显上升。
- Validation:
  - 受影响的 Electron smart-category 聚焦回归 + Release 构建。
- Exit condition:
  - 类别页和系列页都具备路由、列表、结果集和影片详情跳转。

## Cross-cutting rule. Task feedback stays embedded

- Goal:
  - 继续承接扫描和抓取状态，但不引入独立任务中心页面。
- Involved modules:
  - Electron Home page
  - Electron Library page
  - global shell header
  - Worker task summary events
- Risks:
  - 如果页面间任务状态表达不一致，会让用户误以为任务丢失。
- Validation:
  - 受影响的 Electron 回归 + Release 构建。
- Exit condition:
  - 后台任务统一通过“库页内联 + 全局活动条 + Home 摘要”呈现。
