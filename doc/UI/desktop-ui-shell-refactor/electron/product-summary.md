# Jvedio Electron 改造产品摘要

## 目标

- 使用 Electron 重建桌面前端。
- 保留当前 C# 本地业务能力。
- 通过 `plan + doc` 双层文档结构支持跨会话连续推进。

## 第一阶段范围

- 新的桌面主壳
- renderer 真实目录与组件拆分草案
- Home 媒体库管理页
- Library 内容浏览页
- Actors 一级导航页
- Video Detail 页
- Settings 入口与设置页
- Worker API、任务状态桥接与 SSE 细化草案

## 第一阶段非目标

- 不实现远程访问
- 不实现多账户管理
- 不实现 MPV 深度增强
- 不实现内嵌播放器
- 不实现跨平台分发
- 不直接复用参考项目代码和资源

## 现有能力复用来源

- `WindowStartUp`
  - 库管理逻辑
- `Window_Main` / `VieModel_Main`
  - 主窗口内容切换相关逻辑来源
- `Window_Settings`
  - 设置能力来源
- `Core/Scraper/MetaTube/*`
  - MetaTube 抓取
- `Core/Scan/*`
  - 扫描与整理
- `Core/DataBase/*`
  - SQLite
- `Entity/Data/Video.cs`
  - 外部播放器调用、播放写回相关行为

## 参考来源

- 壳层参考：
  - `QiaoKes/fntv-electron`
- 页面实现参考：
  - `jellyfin/jellyfin-web`
- 辅助参考：
  - 现有 `doc/UI/new/` 当前 exe UI 线框与页面规格
  - 现有 `doc/UI/old/` 旧界面截图
