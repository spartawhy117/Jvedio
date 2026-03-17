# Theme And Appearance Spec

## 目的

- 冻结新桌面实现的主题分层方式。
- 明确 `light / dark` 双主题如何配置、切换和落地。
- 说明为什么正式 UI 文档图保持白底，但实现层仍然必须支持暗色主题。

## 当前冻结结论

- 当前正式实现层支持 `light` 与 `dark` 双主题。
- 正式 UI 线框图、弹层图、共享组件图、流程图仍只保留白底版本，不额外维护一套暗色文档图。
- 主题实现框架参考 `clash-verge-rev` 的分层：
  - preload / app bootstrap 先拿到主题模式
  - 全局 theme state 保存当前模式
  - 设计 token 映射到 CSS variables
  - 组件层消费 token，而不是在页面里散写颜色
- 如后续要支持 `system` 跟随系统主题，可以在状态层预留，但当前文档冻结目标仍是 `light / dark`。

## 推荐目录

以下是新壳实现时建议预留的主题相关目录：

- `src/app/theme/ThemeModeProvider.tsx`
- `src/app/theme/theme-mode-store.ts`
- `src/app/theme/theme-tokens.ts`
- `src/app/theme/color-schemes.ts`
- `src/app/theme/use-theme-mode.ts`
- `src/styles/theme.css`

如果最终目录名有调整，保留职责分层即可，不要求文件名一字不差。

## 主题状态模型

### 模式层

- `light`
- `dark`
- `system`（可预留，不要求当前 UI 必须暴露）

### 生效层

- `themeMode`：用户选择的模式
- `resolvedTheme`：真正渲染到界面的主题结果

示例：

- 用户明确选 `dark`：`resolvedTheme = dark`
- 用户未来如果选 `system`：由系统颜色偏好解析出 `light` 或 `dark`

## 初始化顺序

建议采用以下顺序：

1. 本地持久化主题模式
2. 用户设置接口返回的主题偏好
3. 系统主题
4. 默认 `light`

这样做的目的：

- 首屏尽量避免闪烁
- 保证用户手动切换优先级最高
- 给未来设置页落地留接口位

## 主题切换流程

1. 应用启动时先读本地缓存或预加载结果。
2. `ThemeModeProvider` 建立全局主题状态。
3. 根据 `resolvedTheme` 将 token 写入根节点 CSS variables。
4. 组件库主题层和自定义组件统一消费这些变量。
5. 用户在设置页切换主题时：
   - 先更新内存状态
   - 再写本地持久化
   - 如 Worker 设置也承载主题，则同步提交设置接口
   - 页面无须整页刷新

## Token 分层

### 基础 token

- `--color-bg-app`
- `--color-bg-surface-1`
- `--color-bg-surface-2`
- `--color-border-default`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-icon-primary`
- `--color-icon-muted`
- `--color-accent-primary`
- `--color-danger`
- `--color-success`
- `--color-warning`

### 组件语义 token

- `--shell-sidebar-bg`
- `--shell-content-bg`
- `--card-bg`
- `--card-border`
- `--badge-info-bg`
- `--badge-danger-bg`
- `--summary-strip-bg`
- `--dialog-overlay`

规则：

- 页面和组件优先用语义 token，不直接写死十六进制颜色。
- 只有主题定义层可以直接维护颜色值。
- 自定义 SVG 的显色优先跟随 `--color-icon-*` 或 `--color-text-*`。

## 文档图与实现层的关系

- 白底文档图只负责表达结构、层级和交互关系。
- 暗色主题属于实现层能力，不要求为每张线框再画一张暗色版图。
- 如果暗色主题导致布局、层级或交互方式变化，才需要回头更新页面文档，而不是为了“颜色变了”单独出第二套线框。

## 页面接线建议

- `main-shell`：负责提供主题切换入口或承接设置入口。
- `settings-page`：负责展示主题设置项。
- 共享组件：必须通过 token 适配深浅色，不能各写一套散乱颜色。
- 页面级自定义样式：只允许在 token 上做组合，不允许直接绕过主题层硬编码。

## 回归点

- 应用启动时无明显深浅色闪烁。
- `light` 与 `dark` 切换后，导航、卡片、弹窗、状态 badge、分页控件可读性稳定。
- 自定义 SVG、图标按钮、选中态和 hover 态在双主题下都可见。
- 页面截图虽然仍用白底文档图，但实现层暗色模式不会破坏布局和层级。
