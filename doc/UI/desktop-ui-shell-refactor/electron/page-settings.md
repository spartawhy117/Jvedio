# Settings 页规格

## 页面定位

- Settings 由主壳入口打开。
- 承接当前 `Window_Settings` 的设置能力。
- 本页在 renderer 中对应 `features/settings/pages/SettingsPage.tsx`。

## 页面级组件

- `SettingsPage.tsx`
  - 负责分组切换、保存状态和回读
- `SettingsGroupList.tsx`
  - 左侧设置分组导航
- `SettingsSectionForm.tsx`
  - 单分组表单容器
- `SettingsSaveBar.tsx`
  - 保存、重置、dirty 提示
- `MetaTubeDiagnosticsPanel.tsx`
  - MetaTube 连接测试与诊断输出

## Section 结构

- 页面头部
  - 共享组件：
    - `PageHeader`
  - 内容：
    - 页面标题
    - 当前分组说明
- 分组导航区
  - 页面组件：
    - `SettingsGroupList.tsx`
  - 分组：
    - General
    - Libraries
    - MetaTube
    - Playback
    - Data
- 表单区
  - 页面组件：
    - `SettingsSectionForm.tsx`
  - 内容：
    - 当前分组表单项
    - 分组级校验反馈
- 保存栏
  - 页面组件：
    - `SettingsSaveBar.tsx`
  - 内容：
    - 保存
    - 恢复默认
    - dirty 状态
- 诊断区
  - 页面组件：
    - `MetaTubeDiagnosticsPanel.tsx`
  - 内容：
    - MetaTube 连通性测试
    - 诊断日志输出

## 页面状态

- `useSettingsForm.ts`
  - `groups`
  - `currentGroup`
  - `values`
  - `dirtyFlags`
  - `saveStatus`
  - `validationErrors`
- 页面级状态：
  - `isDiagnosticsRunning`
  - `diagnosticsResult`

## API 依赖

- `GET /api/settings`
  - 获取设置分组和值
- `PUT /api/settings`
  - 保存设置
- `POST /api/settings/meta-tube/diagnostics`
  - 执行 MetaTube 诊断
- `GET /api/events`
  - 订阅设置变更结果

## 重点设置项

- General
  - 语言
  - 主题
- Libraries
  - 默认扫描目录
  - 扫描行为
- MetaTube
  - 服务地址
  - 测试番号
  - 连接与诊断
- Playback
  - 视频播放器路径
  - 播放回退策略
- Data
  - cache
  - sidecar
  - 日志入口

## 第四阶段规则

- 第一批真正接线的设置分组优先为：
  - General
  - MetaTube
  - Playback
- 保留保存、应用、恢复默认语义。
- 不新增首启主题/语言向导。

## 第四阶段重点

- 展示当前值
- 保存后可回读
- 设置变更能被后续播放、扫描与抓取链消费

## 第四批实现边界

- 本批要完成：
  - 分组导航
  - 设置值回读
  - 保存
  - 恢复默认
- 第一轮暂不进入：
  - MetaTube 诊断
- 本批不进入：
  - 复杂迁移向导
  - 首启配置流程
  - 高级实验性设置页

## 数据来源

- 当前来源：
  - `Window_Settings`
- 目标来源：
  - Worker `settings` API
