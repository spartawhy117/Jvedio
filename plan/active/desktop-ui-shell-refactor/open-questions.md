# Open Questions

## 当前阶段

- 当前已不再是 Phase 6 的启动阻断排查。
- 当前 open questions 仅保留 **Phase 10：E2E 自动化测试** 还需要在执行中确认的问题。

### OQ-1: E2E 启停入口

- **状态**: 待落地
- **问题**: 当前仓库已有后端播种脚本，但还缺少统一启动前端验收环境的入口。
- **需要确认**: 以 `tauri/scripts/start-e2e-env.ps1` / `tauri/scripts/stop-e2e-env.ps1` 收口，统一串起播种后的 Worker 与 Vite。
- **落点**: Phase 10 期间补齐脚本并同步到 `doc/testing/e2e/playwright-e2e-test-plan.md`。

### OQ-2: 自动化与人工降级边界

- **状态**: 待执行
- **问题**: 浏览器模式能验证页面流转，但桌面外部能力仍需要人工降级。
- **需要确认**:
  - 播放器启动
  - 打开系统文件夹
  - 打开外部来源页
- **落点**: 在 Phase 10 执行记录里明确哪些项用 Playwright MCP 断言，哪些项只保留人工验收结论。

### OQ-3: 抓取失败优雅降级验收口径

- **状态**: 待执行
- **问题**: 前端验收需要围绕真实默认样本 `SNOS-037`、`SDDE-759`、`SDDE-660-C`、`FC2-PPV-1788676` 展开，而不是继续沿用旧的假样本。
- **需要确认**:
  - 失败样本 `FC2-PPV-1788676` 的占位图、详情页状态、单卡重抓入口是否符合预期
  - 正常识别样本 `sdde-660-c -> SDDE-660-C` 是否能在 UI 上完整呈现为成功抓取影片
  - 列表与详情在重抓后是否存在自动刷新缺口

## 已冻结决策（无需再讨论）

- 新壳目录: `tauri/`
- Renderer 主线: `React + TypeScript`
- Worker 策略: 动态端口
- UI 输入: `doc/UI/new/`
- 主题/多语言/图片显色: `doc/UI/new/foundation/`
- Electron: 已物理删除
