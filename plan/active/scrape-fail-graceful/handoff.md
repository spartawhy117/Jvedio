# Handoff — 抓取失败优雅降级

## 当前状态：已完成

---

## Phase 进度

| Phase | 内容 | 状态 |
|-------|------|------|
| 1 | Worker 后端 — 抓取失败写 stub sidecar + ScrapeStatus + VideoIds 强制搜刮 | ✅ 已完成 |
| 2 | 数据库迁移 — `metadata_video` 新增列 | ✅ 已完成 |
| 3 | Contracts — DTO 扩展（含 `LibraryId`） | ✅ 已完成 |
| 4 | Worker API — 按抓取状态筛选 | ✅ 已完成 |
| 4.5 | **右键「重新抓取元数据」— 按设计规格补齐菜单项 + 接入搜刮 API** | ✅ 已完成 |
| 5 | 前端 — 占位图替换 + DTO 同步 + SSE 搜刮成功自动刷新（不新增 UI 元素） | ✅ 已完成 |
| 6 | 单元测试 / 契约测试更新（+10 测试，52→62） | ✅ 已完成 |
| 7 | E2E 脚本更新 | ✅ 已完成 |
| 8 | 文档更新（7 个文档：AGENTS.md + CHANGELOG + 3 测试文档 + e2e-test-data-spec + desktop-ui-shell handoff） | ✅ 已完成 |

---

## 依赖关系

```
Phase 2 (DB 迁移) ← Phase 1 (Worker 逻辑) ← Phase 3 (Contracts)
                                              ↓
Phase 4 (API 筛选) ← Phase 4.5 (右键重新搜刮) ← Phase 5 (前端) ← Phase 6 (测试)
                                                                    ↓
                                                                Phase 7 (E2E)
                                                                    ↓
                                                                Phase 8 (文档)
```

建议执行顺序：`2 → 3 → 1 → 4 → 4.5 → 5 → 6 → 7 → 8`

---

## 关键文件索引

| 文件 | 角色 |
|------|------|
| `dotnet/Jvedio.Worker/Services/LibraryScrapeService.cs` | 抓取核心逻辑，stub 写入 + VideoIds 单影片搜刮 |
| `dotnet/Jvedio.Worker/Services/VideoService.cs` | 影片查询 + sidecar 状态构建 + libraryId 映射 |
| `dotnet/Jvedio.Contracts/Videos/VideoListItemDto.cs` | 列表 DTO：新增 ScrapeStatus + LibraryId |
| `dotnet/Jvedio.Contracts/Videos/VideoDetailDto.cs` | 详情 DTO：新增 ScrapeStatus + LibraryId |
| `dotnet/Jvedio.Contracts/Libraries/StartLibraryScrapeRequest.cs` | 后端已有 VideoIds 字段，无需修改 |
| `tauri/src/api/types.ts` | 前端 DTO 同步 + StartLibraryScrapeRequest 对齐后端 |
| `tauri/src/api/client.ts` | `startLibraryScrape()` 已就绪，无需修改方法本身 |
| `tauri/src/components/shared/VideoCard.tsx` | 卡片占位图替换 |
| `tauri/src/components/shared/VideoContextMenu.tsx` | 通用右键菜单组件，actions 由调用方注入，无需修改 |
| `tauri/src/pages/VideoDetailPage.tsx` | 详情页：sidecar StatusBadge 适配 stub 场景 + SSE 搜刮成功后自动刷新（不新增按钮/横幅） |
| `tauri/src/pages/LibraryPage.tsx` | 右键菜单补齐"重新抓取元数据"（设计规格已定义，代码待接入 API） |
| `tauri/src/pages/FavoritesPage.tsx` | 右键菜单补齐"重新抓取元数据"（同上） |
| `tauri/src/contexts/BootstrapContext.tsx` | SSE 回调增强：补充 video: / favorites invalidate |

## 关键发现（代码调研）

1. **后端已支持单影片搜刮**：`StartLibraryScrapeRequest.VideoIds` + `LoadCandidates` 行 177-199 已处理
2. **前端类型落后于后端**：前端 `StartLibraryScrapeRequest` 只有 `forceRescrape`，缺少 `VideoIds/Mode/WriteSidecars` 等 5 个字段
3. **前端 `startLibraryScrape()` 存在但从未被调用**
4. **搜刮完成后 SSE 刷新链路已就绪**：scrape → `library.changed` → `invalidateQueries("libraries")` → 页面重请求
5. **右键菜单是通用注入式组件**：只需在页面的 `getContextMenuActions()` 中添加新条目
6. **UI 设计规格已定义"重新抓取元数据"菜单项**：`doc/UI/new/dialogs/video-context-menu.md` 中 6 个标准菜单项已含此项，但代码中 `getContextMenuActions()` 只实现了 5 项（缺 rescrape），本轮补齐实现并接入真实 API
7. **UI 规格对齐审查（第四轮）**：逐项对比 plan 与 `doc/UI/new/` 定稿后，删除了 5 项超出设计规格的 UI 新增：VideoDetailPage 重新搜刮按钮、VideoDetailPage 失败横幅、VideoCard scrape-failed-badge 文字标签、Toast 弹窗反馈。任务反馈统一走 SSE → invalidateQueries → 行内摘要自动回刷
