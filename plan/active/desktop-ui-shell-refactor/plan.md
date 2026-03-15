## 用户需求

- 功能目标：
  - 将当前 UI 重构规划从 WPF 线稿路线切换为 `Electron 前端 + C# Worker + localhost API` 路线。
  - 在不改动生产代码的前提下，先把方案文档、进度跟踪文档、验证流程和参考说明完整落地。
  - 让后续新会话优先读取 `handoff.md` 即可恢复上下文，减少 token 消耗。
- 前端方向：
  - 参考 `QiaoKes/fntv-electron` 的桌面壳、导航、页面内容组织与桌面交互方式。
  - 不把多账户、远程访问、MPV 深度能力作为第一阶段目标。
  - 保留 `Actors` 作为左侧一级导航重点页面。
- 后端方向：
  - 保留当前 C# 业务能力，未来拆成 `Jvedio.Core`、`Jvedio.Worker`、`Jvedio.Contracts`。
- 当前阶段：
  - 只做文档与跟踪体系落地，不进入代码实现。

## 文档结构决策

- `plan/active/desktop-ui-shell-refactor/`
  - 管进度、阶段、决策、验证矩阵、会话接力。
- `doc/UI/desktop-ui-shell-refactor/electron/`
  - 管 Electron 稳定规格。
- `doc/UI/desktop-ui-shell-refactor/reference/`
  - 管参考项目说明和借鉴边界。
- `doc/UI/old/`
  - 保留为旧界面基线。
- `doc/UI/new/`
  - 作为 WPF 线稿历史参考保留，不再作为默认实施输入。

## 产品定义

### 前端目标

- 使用 Electron 构建新的桌面主壳。
- 主壳采用固定左导航 + 自适应右内容区。
- 左侧导航第一阶段固定为：
  - Home
  - Favorites
  - Actors
  - 智能分类
    - 类别
    - 系列
  - Libraries
- 设置作为壳层入口，不作为内容区常驻一级页面。
- Home 承接旧 `WindowStartUp` 的库管理能力。
- Library 承接库内容浏览、扫描和抓取入口。
- Video Detail 承接影片详情和播放入口。
- Settings 承接现有配置能力。

### `fntv-electron` 参考边界

- 参考：
  - 桌面主壳风格
  - 页面内容密度
  - Web 前端页面组织
  - 桌面交互感
- 不参考：
  - 多账户管理
  - 远程访问
  - MPV 深度增强
  - 弹幕、智能跳过、硬解专项能力
  - 跨平台分发目标
  - 任何代码、图像、品牌资产的直接复用

### 后端目标

- 保留当前实现来源：
  - MetaTube 抓取
  - 扫描和整理
  - SQLite
  - sidecar 输出
  - 图片与演员头像缓存
  - 设置读写
  - 播放记录写回
  - 外部播放器调用
- 后续拆分方向：
  - `Jvedio.Core`
  - `Jvedio.Worker`
  - `Jvedio.Contracts`
- 通信模型：
  - Electron 主进程后台拉起 Worker
  - Worker 仅监听 `127.0.0.1`
  - 前端通过 localhost API + `SSE` 获取数据和任务状态
  - 不做远程服务化

### 播放能力定义

- 第三批验证中的播放能力继续沿用当前模式：
  - 优先使用已配置的视频播放器路径
  - 未配置时回退系统默认播放器
  - 播放成功后写回观看时间或最近播放状态
- 本期不定义内嵌播放器。

## 分阶段路线图

### 阶段 A：方案文档与参考资产落地

- 重写 active feature 文档为 Electron 路线。
- 建立 `electron/` 子目录文档层。
- 建立 `reference/` 参考说明层。
- 统一标记旧 WPF 线稿为历史参考。

### 阶段 B：前端页面与 Worker API 草案

- 细化页面规格：
  - Home
  - Library
  - Actors
  - Video Detail
  - Settings
- 输出 renderer 真实目录、组件拆分、Worker API 草案与事件流说明。
- 输出 Electron E2E 与 Worker 集成测试草案。

### 阶段 C：实现第一批

- 目标：
  - 库的新建和删除。
- 重点：
  - Home 页库管理最小闭环
  - 左侧库导航联动
  - 数据持久化与错误反馈

### 阶段 D：实现第二批

- 目标：
  - 库默认扫描目录、扫描和抓取闭环。
- 重点：
  - 扫描路径保存
  - MetaTube 命中和整理
  - sidecar 和任务状态反馈

### 阶段 E：实现第三批

- 目标：
  - 影片展示和播放。
- 重点：
  - 库页、详情页、Actors 聚合页
  - 外部播放器链路
  - 播放状态写回

### 阶段 F：实现第四批

- 目标：
  - 设置页面功能完好。
- 重点：
  - 设置入口
  - 现有设置能力接入
  - 配置保存、回读、恢复默认

## 方案路径

### 路径 A：先冻结页面文档与 contracts，再进入第一批实现

- 适用场景：
  - 希望下一轮开始就能直接建工程骨架，不再反复改目录和接口名
- 执行顺序：
  - 对齐五个页面文档与 renderer 组件命名
  - 冻结 Worker contracts / DTO 命名
  - 再进入 Home 最小闭环实现
- 优点：
  - 返工最少
  - 便于后续拆分 `Jvedio.Contracts`
  - 便于多人或跨会话并行推进
- 风险：
  - 会再多花一轮文档收敛时间
- 结论：
  - 推荐

### 路径 B：直接开始 Home 页最小实现，边写边修规格

- 适用场景：
  - 目标是尽快看到 Electron 壳层和 Home 页初版跑起来
- 执行顺序：
  - 直接建 renderer / Electron / Worker 空工程
  - 只围绕 Home 页建最小接口
  - 缺什么再补文档
- 优点：
  - 见效快
  - 更容易验证技术链路
- 风险：
  - 目录和 contracts 容易在第二批扫描闭环时返工
  - 页面文档与实现命名可能继续漂移

### 路径 C：先做技术 Spike，只验证壳层与 localhost 通路

- 适用场景：
  - 主要担心 Electron main / preload / Worker 生命周期与 localhost 通讯稳定性
- 执行顺序：
  - 先建壳层
  - 只打通 `/api/app/bootstrap` 与 `/api/events`
  - 业务页面后置
- 优点：
  - 能最快验证技术可行性
- 风险：
  - 不能直接沉淀业务页面闭环
  - 会把 Home / Library 的业务问题继续后移

## 推荐下一步

- 当前推荐采用 `路径 A`。
- 原因：
  - renderer 目录和 Worker API 刚冻结，如果此时继续补页面组件命名和 contracts 命名，下一轮实现可以直接按稳定骨架推进。
  - Home 第一批实现会依赖 libraries、tasks、bootstrap 三组 contracts，先冻结命名能减少实现时的跨层重命名。

## 下一步执行方案

### 第 1 步：补齐页面规格与 renderer 对齐

- 目标：
  - 让页面文档中的 section、组件名、数据依赖与 `renderer-architecture.md` 完全对齐
- 覆盖文档：
  - `page-home.md`
  - `page-library.md`
  - `page-actors.md`
  - `page-video-detail.md`
  - `page-settings.md`
- 产出要求：
  - 每个页面都明确：
    - 页面级组件
    - section 结构
    - 页面状态
    - 依赖 API
    - 第一批 / 第二批实现边界

### 第 2 步：冻结 contracts 与 DTO 命名

- 目标：
  - 为未来 `Jvedio.Contracts` 建立首批稳定命名
- 覆盖范围：
  - `bootstrap`
  - `libraries`
  - `videos`
  - `actors`
  - `settings`
  - `tasks`
- 产出要求：
  - 每组接口明确：
    - request 名称
    - response 名称
    - task payload 名称
    - event payload 名称
    - 错误码前缀

### 第 2 步当前结果

- 已完成。
- 冻结文档：
  - `worker-api-spec.md`
  - `contracts-naming.md`
- 已冻结范围：
  - `bootstrap`
  - `libraries`
  - `videos`
  - `actors`
  - `settings`
  - `tasks`

### 第 3 步：准备第一批实现入口

- 目标：
  - 在不扩散范围的前提下，确定真正开工的最小闭环
- 闭环范围：
  - Home 页库列表
  - 新建库
  - 删除库
  - 左侧库导航同步
  - bootstrap + libraries + tasks 摘要读取
- 明确不进入：
  - 扫描
  - 抓取
  - 影片详情
  - Settings 全量接入

### 第 3 步推荐输出

- 新增实现入口文档，明确：
  - Electron main / preload / renderer 的首批工程范围
  - Worker 宿主与 localhost API 的首批工程范围
  - `Jvedio.Contracts`、`Jvedio.Worker`、renderer 三边的首批落地顺序
  - Home MVP 的 done 定义与验证顺序

## 下一步完成标准

- 五个页面文档已按 renderer 组件边界重写到可实现粒度。
- Worker contracts 命名已冻结到可创建代码目录的粒度。
- `handoff.md` 中的 Next Recommended Work 已切换为第一批实现准备项。
- 验证文档已新增“文档冻结完成后再进入阶段 C”的检查点。

## 风险与约束

- 当前根目录旧 UI 文档仍存在，后续实施时必须明确以 `electron/` 子目录为准。
- `WindowStartUp` 仍承载库管理逻辑，后续 Home 页迁移必须依赖现有实现梳理。
- 参考项目 `fntv-electron` 与 `jellyfin-web` 已拉取到本地，但只能按既定边界做结构参考，不能误当现成工程模板。
- 本轮变更仅限文档，不修改生产代码，不新增实现工程。

## 验证要求

- `plan/active/desktop-ui-shell-refactor/` 仍是唯一 active feature。
- `handoff.md` 可独立说明当前状态。
- `doc/UI/desktop-ui-shell-refactor/electron/` 文档完整。
- `doc/UI/desktop-ui-shell-refactor/electron/renderer-architecture.md` 与 `worker-api-spec.md` 存在。
- `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-notes.md` 明确区分借鉴与非目标。
- Release 构建通过。
- 本轮仅文档变更，不跑 `Jvedio.Test` 集成测试。

## 用户确认状态

- 当前状态：approved
- 是否批准执行：true
- 已确认 feature slug：`desktop-ui-shell-refactor`
- 已确认前端参考源：`QiaoKes/fntv-electron`
- 已确认文档组织：`plan + doc` 双层结构
- 已确认 `Actors` 为左侧一级导航重点页面
- 已确认播放策略：继续沿用外部播放器
- 已确认当前阶段：只做文档落地，不做代码改造
