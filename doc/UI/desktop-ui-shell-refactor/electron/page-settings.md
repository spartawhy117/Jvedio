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
    - Basic
    - Picture
    - Scan & Import
    - Network
    - Library
    - MetaTube
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

- Basic
  - 语言
  - 调试开关
  - 视频播放器路径
  - 播放回退策略
- Picture
  - 图片缓存
  - 主图模式
  - 固定路径说明
- Scan & Import
  - 扫描行为
  - 导入阈值
  - 基础索引开关
- Network
  - 网络超时
  - 代理与证书相关设置承载
- Library
  - 索引维护入口承载
- MetaTube
  - 服务地址
  - 测试番号
  - 连接与诊断

## 第四阶段规则

- 第一批真正接线的设置分组优先为：
  - Basic
  - MetaTube
- 其余页签先完成结构对齐和现有控件承载，不在这一轮扩展新的 Worker 落库面。
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
  - MetaTube 诊断
- 第一轮补充完成：
  - MetaTube 诊断
  - `settings.changed` 的 renderer 实时消费
- 第二轮补充完成：
  - 6 个页签对齐当前 WPF 可见设置页
  - `Basic / MetaTube` 继续接真实保存链
  - 其余页签先提供结构化控件承载
- 本批不进入：
  - 复杂迁移向导
  - 首启配置流程
  - 高级实验性设置页

## 数据来源

- 当前来源：
  - `Window_Settings`
- 目标来源：
  - Worker `settings` API
