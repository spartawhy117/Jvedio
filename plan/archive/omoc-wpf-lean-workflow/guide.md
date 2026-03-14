# Oh My OpenCode 极简使用方案（WPF 测试 + UI 重构）

> 说明：你要求保存到桌面，但当前 planning 模式只允许写入 `plan/active/<feature>/`。因此本稿先落盘到 `D:\study\Proj\Jvedio\plan\active\omoc-wpf-lean-workflow\guide.md`。如果你确认后续进入非 planning 模式，我再补做桌面导出。

## 1. 目标

这套方案面向像 `Jvedio` 这样的 WPF 桌面项目，核心目标只有一个：

**用尽量少的 agent、尽量少的调度、尽量少的迭代轮次，完成测试工作和 UI 重构工作。**

结合当前仓库现状：
- 主 UI 入口集中在 `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml` 与 `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml.cs`
- 主界面状态集中在 `Jvedio-WPF/Jvedio/ViewModels/VieModel_Main.cs`
- 样式与主题承接点在 `Jvedio-WPF/Jvedio/CustomStyle/StyleManager.cs`
- 测试工程已拆分到 `Jvedio-WPF/Jvedio.Test`
- 当前已有 unit test 与 integration test，但 UI 回归仍更适合走“最小人工冒烟 + 受影响测试”路线

因此，最适合你的不是多 agent 编排，而是：

**单主 agent 串行推进，必要时才做一次低频 explore。**

## 2. 推荐结论

**推荐配置：1 个主 agent，0 个常驻子 agent，最多 1 个按需 explore 子 agent。**

换成执行语言就是：
- 平时只用一个主 agent 处理规划、读代码、改代码、补测试、写文档
- 默认不启用 review agent、不启用多 builder agent、不启用多 explore agent
- 只有在“仓库搜索成本明显高于继续手动阅读”时，才临时启用 1 次 explore

这套配置最适合单订阅用户，因为它：
- token 消耗最稳定
- 不会因为多 agent 重复读取同一批 XAML / code-behind / 测试文件而浪费上下文
- 最适合老 WPF 项目常见的混合结构：MVVM + code-behind + 资源字典 + 历史包袱

## 3. 方案路径

### 路径 A：单 agent 严格串行（推荐）

**适用场景**
- 你希望最省 token
- 你能接受速度略慢，但过程稳定
- 项目是传统 WPF，很多页面和事件链耦合较重
- 任务以“测试补强 + UI 结构整理”为主，而不是多人并行开发

**优点**
- 配置最简单
- 上下文连续性最好
- 最适合大 XAML / 大 code-behind 文件
- 出现问题后最容易续接上下文

**代价**
- 仓库级搜索速度不是最快
- 发现阶段不如“主 agent + explore agent”组合灵活

**风险**
- 如果 feature 切得太大，单主 agent 一样会膨胀

**对 todo / 实施流影响**
- 必须严格按 feature 拆分
- 每轮只处理 1 个 UI 区块或 1 个测试主题
- 每轮结束后再决定是否进入下一轮

### 路径 B：双 agent 轻量协作

**适用场景**
- 你能接受略高一点 token 消耗
- 你经常需要先做全局搜索，再落回局部修改

**优点**
- 搜索效率更高
- 主 agent 上下文更干净

**代价**
- token 消耗更高
- 子 agent 会重复读取仓库
- 每轮都要额外做一次信息回收和汇总

**风险**
- 对单订阅用户来说，收益未必覆盖成本

**对 todo / 实施流影响**
- 每个阶段都要先判断值不值得调用 explore
- 需要增加一次“搜索结果收敛”步骤

**推荐路径：路径 A**

## 4. 极简 agent 拓扑

### 4.1 主 agent（唯一常驻）

主 agent 负责全部主流程：
- 需求澄清
- 读仓库
- 输出计划
- 改 UI
- 补测试
- 写文档
- 生成验证清单

结论很简单：

**不要把角色拆细，默认都交给主 agent。**

### 4.2 explore 子 agent（默认关闭）

只在下面 3 种情况允许启用：
- 需要快速扫哪些 XAML / ViewModel / Test 文件会被影响
- 主窗口文件太大，先做全局定位再回到主 agent
- 需要统计某类事件、绑定、测试用例的分布

严格限制：
- 每个 feature 最多调用 1 次
- 一次只做“搜索”，不做实现
- 返回内容必须压缩成“文件列表 + 结论”，不回传大段原文

### 4.3 review agent（不常驻，不推荐默认启用）

对你的订阅条件，我不建议常规启用独立 review agent。

更省的做法是让主 agent 在每个里程碑自检：
- 有没有行为回归
- 有没有测试遗漏
- 有没有 UI 样式破坏
- 有没有绑定 / 资源字典失配

只有准备提交较大改动时，才值得额外加 1 次 review。

## 5. 建议工作流

### 阶段 0：先规划，不直接改

第一条提示词固定写成：

```text
先进入 planning 模式，不要直接实现。目标是为当前 WPF 改造任务输出最小可执行计划，限制 agent 数量和迭代次数。
```

原因：
- WPF UI 重构很容易一上来就改太多 XAML
- 老项目通常存在 code-behind 事件、资源字典、VM 绑定互相牵扯
- 先规划可以显著减少返工

### 阶段 1：测试和 UI 必须拆成两个 feature

不要把“测试改造”和“UI 重构”放进同一个执行轮次。建议固定拆成两个 feature：

1. `wpf-test-hardening`
2. `wpf-ui-refactor-shell`

原因：
- 测试看的是可验证性、路径隔离、夹具组织
- UI 重构看的是 XAML 结构、样式、交互链路
- 两者混做会让上下文同时塞进大 XAML、大量测试代码和验证标准，很浪费 token

### 阶段 2：UI 再按窗口块拆分

对当前仓库，建议按下面顺序推进，而不是全项目 UI 一次翻修：

1. `Window_Main.xaml` 外壳与主交互区
2. `Window_Settings.xaml` 设置页
3. `Core/UserControls/VideoList.xaml` 列表主体
4. `Dialog_*` 系列弹窗统一风格

理由：
- `Window_Main` 是主壳层，先稳住布局、主题承接和主交互
- `Window_Settings` 常常是体验问题高发区
- `VideoList` 文件大、绑定多，适合单独成 feature
- 对话框统一样式放最后，成本最低

### 阶段 3：测试按层拆，不要急着上 UI 自动化

对这个项目，测试优先级建议是：

1. 先稳住 `Jvedio.Test/UnitTests`
2. 再稳住 `Jvedio.Test/IntegrationTests/Scan`
3. 最后才考虑 UI 冒烟验证

不建议一开始就上重型 UI 自动化，原因是：
- WPF UI 自动化编写成本高
- 老项目控件树复杂
- 单订阅预算更适合先把逻辑测试和关键交互回归清单做扎实

## 6. 建议配置参数

### 6.1 调度限制

| 项目 | 建议值 |
|--|--|
| 常驻 agent 数 | 1 |
| 并发子 agent 数 | 0 |
| 按需 explore 上限 | 每个 feature 1 次 |
| 同轮最多处理文件组 | 1 个 UI 块 / 1 个测试主题 |
| 单轮实现后自检次数 | 1 次 |
| 单轮失败后重试次数 | 1 次 |
| 单 feature 最大往返轮次 | 3 |

解释：
- 第 1 轮：规划与确认
- 第 2 轮：实现或文档落地
- 第 3 轮：修补与收尾

如果到了第 4 轮还没收住，通常不是 agent 不够，而是 feature 切太大了。

### 6.2 上下文控制

主 agent 每轮只允许主动加载：
- 1 个主 XAML
- 1 个对应 code-behind 或 ViewModel
- 1 组相关测试文件
- 1 份相关文档

这样可以避免：
- 把 `Window_Main.xaml`、`VideoList.xaml`、`Window_Settings.xaml` 一次性全塞进上下文
- 主 agent 在无关 UI 区块里来回跳

### 6.3 验证限制

每轮只做最小必要验证：

**测试轮次**
- 跑受影响 unit tests
- 必要时再跑 1 组 integration tests
- 不做全量回归，除非 feature 收尾

**UI 轮次**
- 编译通过
- 打开受影响窗口
- 检查 3 个关键交互
- 记录人工冒烟结果

## 7. 最低可用配置清单

如果你不想再比较，直接固定这 8 条就够了：

1. 默认只用 1 个主 agent
2. 默认不启用常驻子 agent
3. 每个 feature 最多 1 次 explore
4. 测试和 UI 重构必须拆成不同 feature
5. 每轮只处理 1 个窗口/控件块或 1 个测试主题
6. 每个 feature 最多 3 轮往返
7. 先补 unit / scan tests，再补 UI 冒烟
8. 大文件先规划，再实施

## 8. 推荐 AGENTS.md 写法

如果你要给 Oh My OpenCode 一个统一行为约束，我建议写成下面这种短规则：

```md
# WPF Lean Workflow

- Default to Chinese for user-facing replies.
- For WPF tasks, always plan first and do not implement until the plan is confirmed.
- Keep exactly one active feature at a time.
- Use one primary agent by default.
- Do not spawn subagents unless a repository-wide search is necessary.
- If a subagent is needed, use at most one explore agent and only once per feature.
- Split testing work and UI refactor work into separate features.
- For UI refactor, modify one window/control cluster per iteration.
- For test work, prefer unit and scan integration coverage before UI automation.
- Cap each feature to 3 conversation rounds; if it exceeds that, split the feature.
- After each implementation round, produce a concise verification checklist.
```

这段已经够用，不需要写成长文。

## 9. 面向当前 Jvedio 的落地建议

### 9.1 测试线

先做：
- `Jvedio-WPF/Jvedio.Test/UnitTests/Core/*`
- `Jvedio-WPF/Jvedio.Test/IntegrationTests/Scan/*`

后做：
- `Jvedio-WPF/Jvedio.Test/IntegrationTests/MetaTube/*`

原因：
- MetaTube 集成测试依赖真实服务，更慢、更贵、更不稳定
- 先把本地逻辑和扫描链路稳住，性价比最高

### 9.2 UI 线

第一批只碰：
- `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml`
- `Jvedio-WPF/Jvedio/Windows/Window_Main.xaml.cs`
- `Jvedio-WPF/Jvedio/ViewModels/VieModel_Main.cs`
- `Jvedio-WPF/Jvedio/CustomStyle/StyleManager.cs`

第二批再碰：
- `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml`
- `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml.cs`

第一轮不要同时改：
- `Core/UserControls/VideoList.xaml`
- 大量 `Dialog_*`
- 多个 ResourceDictionary

### 9.3 交付顺序

建议按这个顺序让主 agent 工作：

1. 输出测试改造 plan
2. 完成测试结构与关键断言补强
3. 输出主窗口 UI 重构 plan
4. 完成主窗口壳层 UI 重构
5. 做最小人工冒烟 + 受影响测试验证
6. 再决定是否继续 `VideoList` / `Settings`

## 10. 推荐提示词模板

### 10.1 做测试 feature 时

```text
请先进入 planning 模式，不要直接实现。
目标：为 Jvedio 的测试补强输出最小可执行方案。
限制：只用 1 个主 agent，不要常驻子 agent；如果必须搜索，全流程最多调用 1 次 explore。
范围：优先 UnitTests 和 Scan IntegrationTests，不要先扩展 MetaTube 网络测试。
输出：任务拆解、受影响文件、验证方式、风险、最小 handoff。
```

### 10.2 做 UI feature 时

```text
请先进入 planning 模式，不要直接实现。
目标：重构 WPF 主窗口 UI，但控制 token 和迭代次数。
限制：只允许 1 个主 agent；本轮只处理 Window_Main 对应的 XAML、code-behind、ViewModel，不扩展到 VideoList 和 Dialog。
输出：改造目标、视觉范围、交互边界、受影响文件、验证方式、风险、最小 handoff。
```

### 10.3 做实现轮次时

```text
按已确认 handoff 实施，不要扩展范围。
限制：只修改当前 feature 允许的文件；完成后先自检一次，再给出验证清单；如果发现需要第 4 轮往返，停止并建议拆分 feature。
```

## 11. 两轮自迭代记录

### 第 1 轮完善
- 从“只给 agent 数量建议”扩展为“agent 数量 + 调度上限 + feature 切分规则”
- 加入上下文控制与验证限制，避免单订阅场景下 token 失控
- 补上可直接落地的 `AGENTS.md` 短规则模板

### 第 2 轮完善
- 将建议映射到当前 `Jvedio` 仓库的主窗口、主 VM、样式入口、测试入口
- 增加测试线 / UI 线的优先级顺序和交付顺序
- 补充可直接复制使用的提示词模板，降低后续操作成本

## 12. 最终建议

如果你只想要一套**最省订阅、最不折腾**的方案，就直接采用下面这组：

- `1` 个主 agent
- `0` 个常驻子 agent
- 每个 feature 最多 `1` 次 explore
- 测试和 UI 重构拆成两个 feature
- UI 每次只改 `1` 个窗口/控件块
- 每个 feature 最多 `3` 轮往返
- 第 `4` 轮还没收住，就强制拆 feature

一句话版本：

**不要追求 agent 编排，追求 feature 切小、上下文收窄、验证最小化。对单订阅用户，这比任何多 agent 设计都更划算。**
