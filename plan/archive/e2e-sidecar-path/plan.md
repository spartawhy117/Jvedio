# E2E 测试环境 Sidecar 路径迁移

## 文档定位

本计划将 E2E 测试环境下的 sidecar 文件（NFO、海报、缩略图、背景图）从**影片所在目录**迁移到**用户数据缓存目录**，采用方案 B（按库名分子目录）。

**明确范围**：只改测试环境（E2E 播种脚本 + 测试文档），Release 工程代码和正式运行路径**完全不动**。

---

## 背景与决策

### 当前状态

```
E2E sidecar 当前写入位置：
  test-data/e2e/videos/lib-a/{VID}/{VID}.nfo
  test-data/e2e/videos/lib-a/{VID}/{VID}-poster.jpg
  test-data/e2e/videos/lib-a/{VID}/{VID}-thumb.jpg
  test-data/e2e/videos/lib-a/{VID}/{VID}-fanart.jpg
```

### 目标状态（方案 B：按库名分子目录）

```
E2E sidecar 迁移到：
  test-data/e2e/data/{UserName}/cache/video/lib-a/{VID}/{VID}.nfo
  test-data/e2e/data/{UserName}/cache/video/lib-a/{VID}/{VID}-poster.jpg
  test-data/e2e/data/{UserName}/cache/video/lib-a/{VID}/{VID}-thumb.jpg
  test-data/e2e/data/{UserName}/cache/video/lib-a/{VID}/{VID}-fanart.jpg
```

### 为什么只改测试环境

- Release 的 sidecar → 影片目录是已验证的正式逻辑，改它需要扩大回归覆盖，当前不值得
- 测试环境的目录布局可以独立设计，不影响线上行为
- 方案 B 让 sidecar 缓存与演员头像缓存目录结构一致，便于管理和验证

### 方案 B 的优势

- `cache/video/lib-a/{VID}/` 与 `videos/lib-a/{VID}/` 一一对应，定位清晰
- 与 `cache/actor-avatar/` 平行，目录规则统一
- 播种脚本验证可按库名批量检查
- `.gitignore` 中 `test-data/**/cache/` 规则已覆盖，不需要额外 ignore

---

## 执行步骤

### Phase 1：修改播种脚本 — sidecar 验证路径 ✅ 跳过

按计划策略跳过：先只改文档，播种脚本验证逻辑保持不变（仍查 `videos/lib-a/`），等后续 Phase 4 一起改。

### Phase 2：更新测试相关文档 ✅ 已完成

更新 5 个文档，所有 E2E sidecar 路径描述统一为 `data/{UserName}/cache/video/{LibName}/{VID}/`：
1. `e2e-test-data-spec.md` — 数据流图、目录结构树（新增 `cache/video/` 层级）、产物表（增加"当前 vs E2E 目标"双列）
2. `test-targets.md` — E2E 路径对照表 Sidecar 行更新、§3.4 播种路径更新
3. `test-data/config/README.md` — 关键文件一览新增 sidecar 缓存、播种产物路径更新
4. `AGENTS.md` — 关键目录规则新增 E2E 测试 sidecar 独立说明（3 行）
5. `data-directory-convention.md` — §4.3 新增 E2E 测试环境目标路径小节

提交：`d8912da`

### Phase 3：验证文档一致性 ✅ 已完成

- 5 个文档 + plan/handoff 路径描述一致 ✅
- `.gitignore` 的 `test-data/**/cache/` 规则覆盖新路径 ✅
- `cleanup-e2e-data.ps1` 的 `git checkout -- test-data/e2e/data/` 可重置跟踪文件；cache 目录不被跟踪，清理时自然跳过 ✅

### Phase 4：Worker 测试环境路径适配 ✅ 已完成

Worker 代码 + 测试 + 脚本全部适配，E2E 模式下 sidecar 写入 `cache/video/{LibName}/{VID}/`：
- `WorkerPathResolver.cs`：新增 `VideoCacheFolder` + `IsTestEnvironment` 属性（通过 `JVEDIO_APP_BASE_DIR` 环境变量判断）
- `LibraryScrapeService.cs`：新增 `ResolveSidecarDirectory()`，`WriteSidecarsAsync` / `NeedsScrape` 走统一路径路由
- `VideoService.cs`：`BuildSidecarState` / `DeleteVideo` 同样走 `ResolveSidecarDirectory()`
- `SidecarPathTests.cs`：+3 测试（属性存在性、方法存在性、正式模式回退）
- `seed-e2e-data.ps1`：Step 5.9 验证改为 `cache/video/E2E-Lib-A/{VID}/`，保留旧路径 fallback
- `cleanup-e2e-data.ps1`：新增 `cache/` 目录显式删除（不被 git 跟踪）

提交：`6db3941`，55 个测试全部通过。

---

## 通过标准

- [x] 5 个文档中 E2E sidecar 路径描述统一为 `data/{UserName}/cache/video/{LibName}/{VID}/`
- [x] 文档间路径描述无冲突
- [x] Worker 代码在 E2E 模式下写入 cache/video，正式模式仍写影片目录
- [x] `.gitignore` 覆盖新路径
- [x] 55 个后端测试全部通过（含 3 个新增 E2E 路径测试）

---

## 关联文档

- E2E 测试数据规范：`doc/testing/e2e/e2e-test-data-spec.md`
- 测试目标文档：`doc/testing/backend/test-targets.md`
- 测试配置 README：`test-data/config/README.md`
- 数据目录规范：`doc/data-directory-convention.md`
- 仓库入口：`AGENTS.md`
