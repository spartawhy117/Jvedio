# Desktop UI New

本目录是当前 exe UI 调整的唯一实施文档入口。

如果后续继续做界面收口、结构调整或视觉对齐，默认先看本目录，再决定是否需要回看 `../desktop-ui-shell-refactor/electron/` 下的架构说明。

## 当前使用方式

- 页面线框：
  - `main-shell.*`
  - `home-page.*`
  - `favorites-page.*`
  - `actors-page.*`
  - `library-page.*`
  - `library-page-content.*`
  - `settings-page.*`
- 对应规格：
  - `main-shell.md`
  - `home-page.md`
  - `favorites-page.md`
  - `actors-page.md`
  - `library-page.md`
  - `settings-page.md`
  - `icon-config.md`
- 辅助图：
  - `icon-config.*`

## 文档边界

- 本目录负责：
  - 当前 exe UI 的页面结构、主要交互、线框和图标语义
- `../desktop-ui-shell-refactor/electron/` 负责：
  - Electron 路线的架构、桥接、API、阶段规划
- `../old/` 负责：
  - 旧界面基线截图

## 当前约束

- 当前 exe UI 调整优先对齐这里的线框和规格，不再以 `desktop-ui-shell-refactor` 根目录旧说明文档作为实施依据。
- 若页面实现与本目录规格不一致，先更新本目录文档，再继续改代码。
