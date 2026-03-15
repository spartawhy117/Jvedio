# Desktop UI Shell Refactor

本目录现在同时承载两层内容：

- 当前主路线：Electron 产品规格与参考资产
- 历史参考：此前为 WPF 线稿阶段准备的共享壳、页面 spec 与线稿输出

后续新会话和后续实现，默认优先阅读：

1. `plan/active/desktop-ui-shell-refactor/handoff.md`
2. `doc/UI/desktop-ui-shell-refactor/electron/README.md`
3. `doc/UI/desktop-ui-shell-refactor/reference/fntv-electron-notes.md`

## 当前主入口

- `electron/`
  - 当前 Electron 路线的稳定规格文档
- `reference/`
  - 参考项目说明与借鉴边界

## 历史参考层

以下根目录旧文档继续保留，但不再作为默认实施入口：

- `information-architecture.md`
- `main-shell-spec.md`
- `home-page-spec.md`
- `favorites-page-spec.md`
- `actors-page-spec.md`
- `library-page-spec.md`
- `settings-page-spec.md`
- `theme-spec.md`
- `icon-config-spec.md`
- `drawing-output-guide.md`

这些文档可用于回看此前 WPF 线稿阶段的设计思路，但 Electron 实施应以 `electron/` 子目录为准。

## 输出目录说明

- `wireframes/`
  - 旧 WPF 线稿阶段输出
- `mockups/`
  - 旧 WPF 视觉稿输出
- `assets/`
  - 设计辅助资源

## 历史线稿说明

- [doc/UI/new](D:\study\Proj\Jvedio\doc\UI\new)
  - 当前保留为 WPF 线稿历史参考目录
- [doc/UI/old](D:\study\Proj\Jvedio\doc\UI\old)
  - 保留为旧界面基线截图目录
