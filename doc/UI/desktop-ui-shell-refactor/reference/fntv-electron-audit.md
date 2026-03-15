# `fntv-electron` 首轮源码审计

## 审计目标

- 确认 `QiaoKes/fntv-electron` 适合被 Jvedio 借鉴的层级。
- 明确哪些内容只能看思路，不能直接照搬。
- 为后续 `Electron 前端 + C# Worker + localhost API` 路线提供参考边界。

## 审计样本

- 本地路径：
  - `D:\study\Proj\fntv-electron`
- 审计分支：
  - `release`
- 审计提交：
  - `4eb63089687abaa733c1f85783630b1da391178d`
- 审计时间基线：
  - `2026-03-09 22:34:37 +0800`
- 版本声明：
  - `package.json` 中为 `2.6.1`

## 结构观察

### 仓库形态

- 这是一个 Electron 应用仓库，不是典型的 `Electron + React/Vue SPA` 前端仓库。
- 根目录关键结构：
  - `src/main/`
    - Electron 主进程
  - `src/preload/`
    - 向远端页面注入按钮、标题栏和行为增强
  - `src/modules/`
    - 本地 API、播放器、配置、更新、代理等能力
  - `resource/login/`
    - 本地登录页
  - `third_party/`
    - 外部播放器与代理相关依赖

### 运行模型

- 启动后由 Electron 主进程创建无边框窗口、托盘和代理进程。
- 登录页是本地静态 HTML，不是远端页面。
- 登录成功后，主窗口直接加载飞牛服务端的远端页面。
- 业务增强主要靠 preload 和 IPC：
  - preload 注入标题栏
  - preload 劫持或克隆播放按钮
  - 主进程拉起本地 MPV、代理进程、更新器和托盘逻辑

### 页面组织方式

- 仓库内没有完整的本地页面目录，也没有独立的前端页面组件树。
- “Home / Library / Detail” 等页面内容主要来自远端飞牛 Web 页面。
- 本地代码只是在远端 DOM 基础上加桌面壳和桌面能力。

## 与 Jvedio 的参考匹配度

### 可借鉴

- 桌面壳层思路：
  - 无边框窗口
  - 自定义标题栏
  - 托盘与关闭最小化策略
  - 本地进程生命周期管理
- 桌面能力桥接：
  - 前端触发播放
  - 主进程负责本地播放器调起
  - 独立进程承载代理或附属服务
- 桌面交互风格：
  - 工具型密度
  - 本地应用而非网页站点的交互节奏

### 仅能借鉴思路，不能当模板

- 页面文件组织
  - 该仓库并没有 Jvedio 需要的本地页面实现结构。
- 数据流设计
  - 该仓库不是 `renderer -> localhost Worker API -> SSE` 的目标结构。
- 路由与页面职责
  - 页面主体在远端服务，不适合作为 Jvedio 本地前端页面规范样本。

## 关键审计结论

### 结论 1

- `fntv-electron` 更适合作为“桌面壳参考项目”，而不是“业务页面参考项目”。

原因：

- 页面主体不在本地仓库。
- 主要增量在桌面包装和远端页面增强。
- Jvedio 计划中的 Home、Library、Actors、Video Detail、Settings 仍然必须自主定义本地页面规格。

### 结论 2

- 它能为 Jvedio 提供的价值，集中在 Electron main / preload / 本地能力挂接这一层。

原因：

- 托盘、标题栏、窗口控制、外部播放器、代理进程、更新流程都在这个层次。
- 这与 Jvedio 后续的 Electron 壳、Worker 拉起和播放调用链路有直接类比价值。

### 结论 3

- 它不适合作为 Jvedio 安全边界的直接参考。

原因：

- 该项目为了兼容远端页面注入，采用了较激进的 Electron 设置和网络放宽策略。
- Jvedio 如果完全照搬，会把本地桌面程序的安全边界做得过宽。

## 风险点与禁止照搬项

### 1. 安全边界过宽

- `src/main/common/mainwin.ts` 中：
  - `nodeIntegration: true`
  - `contextIsolation: false`
- `src/main/main.ts` 中：
  - `--no-sandbox`
  - `--disable-web-security`
  - `--ignore-ssl-errors`

审计判断：

- 这些设置对其“远端页面注入”模式有便利性，但不适合作为 Jvedio 默认基线。
- Jvedio 应优先采用更收敛的 preload 暴露面和更严格的窗口安全配置。

### 2. 远端 DOM 选择器依赖脆弱

- `src/preload/plugins/playButton.ts`
- `src/preload/plugins/playMaskButton.ts`
- `src/preload/plugins/titlebar.ts`

审计判断：

- 这些能力依赖远端页面的 DOM 结构和 class 命名。
- 上游页面一旦改版，本地增强就可能失效。
- 这类写法可作为“临时补丁思路”，不应成为 Jvedio 自身页面系统的基础做法。

### 3. 配置安全策略不宜复用

- `src/modules/fn_config/config.ts` 中使用固定密钥和固定 IV 处理历史密码。

审计判断：

- 这更像轻量混淆，不是高强度本地机密保护。
- Jvedio 若未来需要本地凭据保存，应单独设计安全存储方案，不直接参考这套实现。

### 4. 播放与代理链路强耦合飞牛语义

- `src/main/handlers/plugins/media.ts`
- `src/main/common/proxy.ts`
- `src/modules/fn_api/`

审计判断：

- 其播放与代理链路围绕飞牛接口、Token、播放源和本地 proxy 设计。
- Jvedio 的数据来源、扫描链、抓取链、播放回写逻辑不同，只能借鉴“职责分层”，不能照搬接口设计。

## 对 Jvedio 当前路线的直接启发

### Electron 壳层

- 可以参考其：
  - 托盘存在感
  - 无边框窗口与自定义标题栏
  - 关闭即最小化 / 真退出的分流
- 不应参考其：
  - 全局放宽安全策略
  - 远端 DOM 注入主导的产品实现方式

### Worker 桥接

- 可以参考其“本地能力不放在页面里”的原则。
- Jvedio 应继续坚持：
  - renderer 只做 UI
  - Worker 做扫描、MetaTube、SQLite、sidecar、播放调用
  - 通过 localhost API + SSE 通信

### 页面规格

- `fntv-electron` 不能替代 Jvedio 当前已有的页面规格文档。
- Home / Library / Actors / Video Detail / Settings 仍应以 Jvedio 自身业务职责为准。

## 建议沉淀到 Jvedio 文档的边界

- `fntv-electron` 只作为以下参考源：
  - 桌面壳
  - 导航节奏
  - 页面密度
  - 托盘与窗口交互
  - 本地播放器调起体验
- `fntv-electron` 不作为以下参考源：
  - 页面组件树
  - 本地路由结构
  - 前端状态模型
  - Worker API 设计
  - 安全配置

## 对下一步工作的建议

- 在 Jvedio 的 Electron 实施规格中，把“壳层借鉴”和“业务页自主实现”明确分开。
- 后续若进入实现阶段，优先拆分：
  - Electron main
  - preload
  - renderer
  - C# Worker
- 如果需要继续深挖参考项目，优先只看以下主题：
  - 托盘
  - 自定义标题栏
  - 主进程生命周期
  - 本地播放器调起

## 审计结论摘要

- 本地参考仓库已成功拉取。
- 该项目适合作为桌面壳和桌面增强参考。
- 该项目不适合作为 Jvedio 页面实现模板。
- 其安全设置、DOM 注入方式和凭据保存方式均不应直接照搬。
