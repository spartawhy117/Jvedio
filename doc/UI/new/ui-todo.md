# Desktop UI TODO

本清单用于完成当前 exe UI 文档的最终收口。

## 当前硬规则

- `doc/UI/new/` 是当前 exe UI 的唯一正式页面文档入口。
- 页面三件套统一放在 `doc/UI/new/pages/`。
- 弹层三件套统一放在 `doc/UI/new/dialogs/`。
- 共享组件三件套统一放在 `doc/UI/new/shared/`。
- 从旧文档迁移内容时，只允许补充规格说明、数据来源、交互规则、实现边界和回归点。
- 不允许因为迁移旧文档内容而修改当前已经确认的 UI 线框。
- 不允许新增当前线框中不存在的 UI 元素、按钮、区块或排布。
- 当前页面结构、控件内容和布局，以 `doc/UI/new/pages/*.png`、`doc/UI/new/dialogs/*.png`、`doc/UI/new/shared/*.png` 与对应 `.excalidraw` 为准。
- 旧目录中仍有价值的内容，优先迁移到对应新文档，而不是继续保留旧目录。
- 旧目录迁移完成后，删除 `doc/UI/desktop-ui-shell-refactor/` 整个目录。
- 新增流程图统一放在 `doc/UI/new/flow/`。
- 流程图正式产物统一为：
  - `.png`
  - `.excalidraw`
- 本轮不再生成 `.mmd`。

## 当前执行顺序

- [x] 对比 `doc/UI/new/pages/*.md`、`doc/UI/new/dialogs/*.md`、`doc/UI/new/shared/*.md` 与 `doc/UI/desktop-ui-shell-refactor/electron/*.md`
- [x] 梳理旧页面文档中仍有价值、且不会改变当前 UI 结构的内容块
- [x] 将旧 `page-home.md` 中可复用内容迁入：
  - `pages/library-management-page.md`
- [x] 将旧 `page-library.md` 中可复用内容迁入：
  - `pages/library-page.md`
- [x] 将旧 `page-actors.md` 中可复用内容迁入：
  - `pages/actors-page.md`
  - `pages/actor-detail-page.md`
- [x] 将旧 `page-video-detail.md` 中可复用内容迁入：
  - `pages/video-detail-page.md`
- [x] 将旧 `page-settings.md` 中可复用内容迁入：
  - `pages/settings-page.md`
- [x] 将旧 `information-architecture.md` 中可复用内容迁入：
  - `pages/main-shell.md`
- [x] 将旧技术文档中对当前页面规格仍有帮助的稳定结论，按主题分散补入：
  - `pages/main-shell.md`
  - `pages/library-management-page.md`
  - `pages/library-page.md`
  - `pages/actors-page.md`
  - `pages/actor-detail-page.md`
  - `pages/video-detail-page.md`
  - `pages/settings-page.md`
  - `shared/shared-components.md`
- [x] 重点补强 `pages/settings-page.md`，至少补齐：
  - 重点设置项
  - 当前真实接线范围
  - 当前仅做结构承载的分组
  - 实现边界
  - 数据消费关系
- [x] 复查所有迁移后的 `pages/*.md`、`dialogs/*.md`、`shared/*.md`，确认未引入任何新的 UI 元素或布局变化
- [x] 更新 `doc/UI/new/README.md`，移除对 `desktop-ui-shell-refactor/` 的依赖说明
- [x] 更新 `page-index.md`，如有必要补充文档说明边界
- [x] 更新 `CHANGELOG.md`，记录本轮 UI 文档迁移与旧目录删除
- [x] 删除 `doc/UI/desktop-ui-shell-refactor/` 整个目录及其全部内容
- [x] 修复 active feature 文档中对旧目录的当前入口引用，重点包括：
  - `plan/active/desktop-ui-shell-refactor/handoff.md`
  - `plan/active/desktop-ui-shell-refactor/plan.md`
  - `plan/active/desktop-ui-shell-refactor/validation.md`
  - `plan/active/desktop-ui-shell-refactor/implementation-steps.md`
- [x] 新建 `doc/UI/new/flow/`
- [x] 新建 `doc/UI/new/flow/README.md`，作为流程图索引
- [x] 生成主壳导航流程图：
  - `main-shell-navigation-flow.excalidraw`
  - `main-shell-navigation-flow.png`
- [x] 生成库管理流程图：
  - `library-management-flow.excalidraw`
  - `library-management-flow.png`
- [x] 生成单库工作台流程图：
  - `library-workbench-flow.excalidraw`
  - `library-workbench-flow.png`
- [x] 生成喜欢页流程图：
  - `favorites-flow.excalidraw`
  - `favorites-flow.png`
- [x] 生成演员页流程图：
  - `actors-flow.excalidraw`
  - `actors-flow.png`
- [x] 生成类别页流程图：
  - `categories-flow.excalidraw`
  - `categories-flow.png`
- [x] 生成系列页流程图：
  - `series-flow.excalidraw`
  - `series-flow.png`
- [x] 生成影片详情与播放流程图：
  - `video-detail-playback-flow.excalidraw`
  - `video-detail-playback-flow.png`
- [x] 生成设置页流程图：
  - `settings-flow.excalidraw`
  - `settings-flow.png`
- [x] 生成任务失败详情与重试流程图：
  - `task-failure-retry-flow.excalidraw`
  - `task-failure-retry-flow.png`
- [x] 更新 `flow/README.md`，补齐每张流程图的用途说明
- [x] 执行 Release 构建验证
- [ ] 按阶段提交并推送

## 迁移规则

- 允许迁移：
  - 页面定位
  - 页面职责
  - 主要能力
  - API 依赖
  - 数据来源
  - 当前实现边界
  - 当前不做内容
  - 当前真实接线范围
  - 事件消费规则
  - 回归关注点
- 不允许迁移：
  - 已过期的页面组件命名
  - 已过期的 hook / tsx 文件名假设
  - 与当前线框冲突的旧交互
  - 与当前线框冲突的旧区块布局
  - 当前新图中没有的按钮、切换器、分栏或附加入口
- 如果旧文档内容与当前新图冲突：
  - 一律以 `doc/UI/new/` 下当前图片和页面文档为准
  - 旧内容直接丢弃，不折中保留

## 流程图规则

- 流程图只表达：
  - 页面进入关系
  - 页面内主链路动作
  - 返回链路
  - 数据读取与提交关系
  - 任务与事件反馈关系
- 流程图不表达：
  - 视觉设计说明
  - 页面像素级布局
  - 未确认的新功能
  - 临时草案控件
- 流程图风格参考：
  - 当前 `doc/UI/new/flow/` 下已确认的正式流程图
- 流程图输出规则：
  - 使用画布 MCP 绘制
  - 导出 `.png`
  - 保留 `.excalidraw` 源文件
- 弹层流程不单独拆成大量小图：
  - 优先并入所属页面主流程图中
  - 只有任务失败详情与重试链路单独成图

## 当前结果目标

- `doc/UI/new/` 下所有页面文档都补齐当前实现所需的规格信息。
- `settings-page.md` 不再只有页面壳说明，而具备足够完整的设置项、接线范围和实现边界说明。
- `doc/UI/desktop-ui-shell-refactor/` 不再保留。
- 当前 UI 页面、弹层、共享组件、文档与流程图全部收口到 `doc/UI/new/`。
- `doc/UI/new/flow/` 成为当前 UI 流转图唯一入口。
- 所有迁移都不改变当前已经确认的新 UI 结构。
- `page-index.md`、`README.md` 与 `flow/README.md` 能互相指回当前正式图片、文档与流程图入口。

## 验收标准

- 任意一个 `doc/UI/new/pages/*.md`、`doc/UI/new/dialogs/*.md`、`doc/UI/new/shared/*.md` 都没有因为内容迁移而要求新增 UI 元素或改变布局。
- `doc/UI/new/README.md` 不再把 `desktop-ui-shell-refactor/` 作为当前入口依赖。
- `doc/UI/desktop-ui-shell-refactor/` 被完整删除。
- `doc/UI/new/flow/` 下流程图文件齐全，命名统一。
- 每张流程图都有对应 `.png` 与 `.excalidraw`。
- Release 构建通过。
- 本轮如仅涉及文档与图片资产整理，则可不跑 `Jvedio.Test` 集成测试，但需在提交说明中明确原因。
