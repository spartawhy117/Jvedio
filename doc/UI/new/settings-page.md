# Settings Page Spec

## 页面目的

- `Settings Page` 是当前 exe 的独立设置页。
- 它负责设置读取、保存、恢复默认，以及 MetaTube diagnostics 的集中入口。

## 页面范围

- 本页负责：
  - 设置分组导航
  - 设置项读取与保存
  - 保存反馈
  - 恢复默认
  - MetaTube diagnostics
- 本页不负责：
  - 应用内更新下载流程
  - 独立任务中心
  - 库内容浏览

## 数据来源

- 读取设置：
  - `GET /api/settings`
- 保存设置：
  - `PUT /api/settings`
- 恢复默认：
  - `POST /api/settings/reset`
- MetaTube diagnostics：
  - `POST /api/settings/meta-tube/diagnostics`

## 布局

- 页面采用紧凑双栏结构：
  - 左侧分组导航
  - 右侧单列表表单区
- 顶部保留页面标题和关闭入口。
- 当前阶段每个分组使用统一单列表，不拆多卡片。

## 左侧分组

- `基本`
- `图片`
- `扫描与导入`
- `网络`
- `库`
- `MetaTube`

规则：
- 同一时间只选中一个分组。
- 当前线框以 `基本` 为选中态。

## 元素清单

| 元素 | 类型 | 常显 | 行为 | 数据来源 | 说明 |
| --- | --- | --- | --- | --- | --- |
| 分组导航 | 左侧导航 | 是 | 切换设置分组 | 当前路由 | 保持 6 个一级分组 |
| 设置列表 | 表单列表 | 是 | 编辑当前分组设置项 | `GET /api/settings` | 单列表紧凑布局 |
| 行级输入控件 | 输入/开关/选择器 | 是 | 更新草稿值 | 当前表单态 | 与设置项类型对应 |
| `恢复默认` | 次按钮 | 是 | 重置当前设置草稿 | `POST /api/settings/reset` | 需反馈结果 |
| `保存设置` | 主按钮 | 是 | 提交设置 | `PUT /api/settings` | 保存中显示反馈 |
| diagnostics 区 | 辅助面板 | 条件 | 执行 MetaTube 诊断 | `POST /api/settings/meta-tube/diagnostics` | 仅 MetaTube 分组显示 |

## 交互规则

- 从主壳层顶部 `设置` 按钮进入本页。
- 分组切换时保留统一的设置页壳层，不弹独立窗口。
- 右侧列表优先展示当前真实落库的设置项：
  - 语言
  - Debug
  - MetaTube 地址
  - 请求超时
  - 播放器路径
  - 系统默认回退
- 保存后显示明确反馈。
- 恢复默认后，当前表单值同步回默认状态。
- 如果有外部 `settings.changed` 事件，应刷新持久化值并保护未保存草稿。

## 状态定义

### Loading

- 首次进入本页时显示设置读取 loading。

### Saving

- 保存进行中时禁用重复提交。

### Dirty

- 表单修改但未保存时显示未保存状态。

### Error

- 读取或保存失败时显示错误提示。

## 性能与体验约束

- 设置页保持紧凑单列表，不堆叠大段说明文字。
- 说明性语义统一写入文档，不写入页面线框。
- MetaTube diagnostics 结果区只在相关分组显示，不污染其它分组。

## 回归点

- 设置页可正常进入。
- 6 个分组入口正确显示。
- 设置可读取、保存、恢复默认。
- MetaTube diagnostics 可触发并展示结果。
- `settings.changed` 事件消费后状态正确。

## 相关文档

- 主壳层：`main-shell.md`
- 共享组件：`shared-components.md`
