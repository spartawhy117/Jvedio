# 测试文档索引

本目录收拢项目所有测试相关文档，按测试层次分为两个子目录。

## 目录结构

```
doc/testing/
├── README.md                          ← 本文件（索引入口）
├── backend/                           ← 后端集成测试（Jvedio.Test C# 工程）
│   ├── test-plan.md                   ← 测试工程组织方式、配置、脚本、执行流程
│   ├── test-targets.md                ← 测试目标与通过标准（强/弱断言）
│   └── test-current-suite.md          ← 当前已实现的 16 个测试清单
└── e2e/                               ← 前端 E2E 自动化（Playwright）
    ├── playwright-e2e-test-plan.md    ← Playwright MCP 执行方案、启停流程、已知限制
    └── playwright-e2e-test-cases.md   ← 48 个 E2E 用例（7 张流程图拆解）
```

## 阅读顺序

### 了解后端测试体系

1. `backend/test-targets.md` — 先了解**要测什么**
2. `backend/test-plan.md` — 再了解**怎么测**（工程结构、配置、脚本）
3. `backend/test-current-suite.md` — 最后查看**当前测了什么**

### 了解前端 E2E 测试

1. `e2e/playwright-e2e-test-plan.md` — 执行方案与环境搭建
2. `e2e/playwright-e2e-test-cases.md` — 48 个具体用例

## 关联文档

| 文档 | 位置 | 说明 |
|------|------|------|
| 验证矩阵 | `plan/active/desktop-ui-shell-refactor/validation.md` | Phase 6 / Phase 7 验证记录 |
| 日志规范 | `doc/logging-convention.md` | Worker + Shell 日志配置 |
| 流程图索引 | `doc/UI/new/flow/README.md` | E2E 用例的流程图来源 |
| 测试数据目录 | `Jvedio-WPF/Jvedio.Test/config/scan/input/` | 假视频文件放置目录 |
| MetaTube 测试配置 | `Jvedio-WPF/Jvedio.Test/config/meta-tube/meta-tube-test-config.json` | VID 列表与服务地址 |
| 开发总览 | `doc/developer.md` | 项目入口文档 |

## 维护规则

- 新增测试文档时，先判断属于 `backend/` 还是 `e2e/`，放到对应子目录
- 新增文档后，更新本 README 的目录结构和阅读顺序
- 如果新增第三类测试层（如性能测试），在本目录下新建对应子目录
