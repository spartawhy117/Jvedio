# UI Foundation Specs

本目录承载当前新桌面实现中**跨页面、跨壳层、长期有效**的基础规范。

它主要解决三个问题：

- `light / dark` 双主题到底怎么组织
- `zh / en` 多语言到底怎么拆目录、怎么初始化
- 图片 / 图标 / SVG / 应用 icon 到底怎么分类、怎么显色、怎么走接入流程

## 和 `plan/` 的分工

- `plan/archive/desktop-ui-shell-refactor/`：负责阶段路线、冻结结论、执行入口、验证矩阵与迁移边界。
- `doc/UI/new/pages/`：负责页面范围、元素清单、状态和交互规则。
- `doc/UI/new/flow/`：负责页面进入关系、主链路动作和返回链路。
- `doc/UI/new/foundation/`：负责主题、多语言、资源接入这类**长期实现规范**。

结论上，**这三个点不再只放在 `plan.md` 里**；`plan.md` 只保留冻结结论和执行入口，详细配置与流程统一维护在这里。

## 后续执行默认阅读顺序

- 先看 `plan/archive/desktop-ui-shell-refactor/handoff.md`，确认当前进度与冻结路线。
- 再看 `doc/UI/new/page-index.md` 与 `doc/UI/new/flow/README.md`，明确页面集合、主链路和返回链路。
- 进入具体实现前，再按需细读：
  - `theme-and-appearance.md`
  - `localization.md`
  - `assets-icons-and-coloring.md`

## 当前文档

- `theme-and-appearance.md`
  - 双主题模式、token 分层、CSS variables、主题切换流程
- `localization.md`
  - 中英双语结构、初始化顺序、key 组织、落地流程
- `assets-icons-and-coloring.md`
  - 图片 / 图标分类、显色策略、目录建议、接入流程与轻量来源记录

## 维护规则

- 如果修改了主题模式、token 命名、主题切换链路或深浅色设计边界，必须同步更新 `theme-and-appearance.md`。
- 如果修改了语言包目录、初始化顺序、fallback 语言或 key 组织方式，必须同步更新 `localization.md`。
- 如果修改了图片 / 图标目录、显色策略、SVG 使用方式、主题变体规则或应用 icon 打包方式，必须同步更新 `assets-icons-and-coloring.md`。
- 如果这些变化进一步影响页面职责、组件表现或流程返回链路，还要继续同步更新对应的页面文档、共享组件文档和流程文档。

## 当前冻结口径

- 主题：正式实现层支持 `light / dark` 双主题，文档图继续只保留白底正式稿。
- 多语言：首批只做 `zh` 与 `en`。
- 图片 / 图标：通用操作图标优先走 icon library，品牌与业务图标维护自有 SVG；图片显色策略和目录流程以 `assets-icons-and-coloring.md` 为准。
- 第三方资源：当前项目以个人使用为主，不引入重型合规流程；但若直接复用第三方原始图片，至少要在资源旁或提交说明里留一行来源备注，避免后续完全失忆。
