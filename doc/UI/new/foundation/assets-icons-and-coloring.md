# Assets, Icons And Coloring Spec

## 目的

- 冻结图片 / 图标 / SVG / 应用 icon 的资源分层。
- 明确“图片显色”到底怎么做，避免后续每个页面各搞一套。
- 给出从选型到接入的完整流程，让资源接线可以稳定复用。

## 当前冻结结论

- 通用操作图标优先走 icon library，不手工维护一大批重复 SVG。
- 品牌与业务图标维护自有 SVG。
- 当前风格参考 `clash-verge-rev` 的整体方向，更接近 `Material Symbols Rounded / MUI Icons`，不是 Fluent 风格。
- 图片显色策略分层处理：
  - 单色功能图标：跟随主题 token 显色
  - 品牌 logo：默认不跟随普通功能色
  - 多色插画 / 空态图：按主题切换资源，不强行运行时染色
  - 影片 Poster / Thumb / Fanart：保持原图，不做主题染色
- 当前项目以个人使用为主，不引入重型合规流程；但若直接复用第三方原始图片，至少要留最小来源备注。

## 推荐目录

建议新壳目录预留以下资源结构：

- `src/assets/image/brand/`
  - 应用 logo
  - 品牌标识
  - 托盘相关图
- `src/assets/image/itemicon/`
  - 导航图标
  - 页面专属业务图标
- `src/assets/image/component/`
  - 组件内使用的自定义 SVG
- `src/assets/image/illustration/`
  - 空态图
  - 引导图
  - 复杂多色插画
- `src/assets/image/temp/`
  - 临时评审资源，不进入正式打包主线
- `src-tauri/icons/`
  - 应用安装包图标、窗口图标、系统托盘图标等桌面壳资源

说明：

- Worker 返回的影片海报、缩略图、fanart 不属于这里的静态设计资产，它们属于业务数据资源。
- 临时评审图不应长期停留在正式目录里；定稿后要么归档，要么转正并规范命名。

## 图片显色总规则

### 1. 通用操作图标

适用：

- 新增
- 编辑
- 删除
- 返回
- 设置
- 播放
- 搜索
- 刷新

规则：

- 优先直接使用 icon library，例如组件库自带图标或 `Material Symbols Rounded / MUI Icons` 风格图标。
- 显色通过组件颜色或 `currentColor` 跟随主题 token。
- 不为这类图标单独维护本地彩色 SVG，除非确有业务识别需求。

### 2. 单色自定义 SVG

适用：

- 导航业务图标
- 页面专属 icon
- 组件自定义 icon

规则：

- `fill` 或 `stroke` 优先使用 `currentColor`。
- 允许保留 `fill="none"`、裁剪路径等必要定义，但不要把主色写死。
- 组件侧通过 token 控制颜色，例如：
  - 默认态：`--color-icon-muted`
  - hover / active：`--color-icon-primary`
  - danger：`--color-danger`

这是**图片显色的主线方案**，也是你当前最需要的稳定做法。

### 3. 品牌 Logo

适用：

- 应用 Logo
- 品牌字标
- 托盘主图标

规则：

- 默认不跟随普通功能图标颜色一起染色。
- 如果深浅色背景下确实需要两套表现，使用：
  - `logo-light.svg`
  - `logo-dark.svg`
- 不建议在运行时对品牌 logo 强行套统一 tint，避免失真。

### 4. 多色插画 / 空态图

适用：

- 空结果插画
- 引导页插画
- 占位图

规则：

- 不建议运行时做复杂 tint。
- 推荐直接维护主题变体：
  - `empty-library-light.svg`
  - `empty-library-dark.svg`
- 组件根据当前主题选资源，而不是用滤镜硬染。

### 5. 业务媒体图片

适用：

- Poster
- Thumb
- Fanart
- 演员头像

规则：

- 保持原图，不参与主题染色。
- 暗色主题下只调整外层容器背景、边框、占位和阴影，不改业务图片本身颜色。
- 加载失败时展示主题适配后的占位图或占位块。

## 主题 token 与显色映射

建议至少预留这些 token：

- `--color-icon-primary`
- `--color-icon-muted`
- `--color-icon-on-accent`
- `--color-text-primary`
- `--color-text-secondary`
- `--color-accent-primary`
- `--color-surface-1`
- `--color-surface-2`
- `--color-border-default`
- `--color-danger`

显色规则：

- 单色 icon：优先吃 `--color-icon-*`
- 文本型小图标：可跟 `--color-text-secondary`
- 危险动作 icon：吃 `--color-danger`
- 反白 icon：吃 `--color-icon-on-accent`
- SVG 所在按钮、tab、导航项不要各自再写一套硬编码颜色

## 资源接入流程

### 步骤 1：先判断资源类型

按以下顺序判断：

1. 它是不是常见操作图标？
2. 它是不是业务识别图标？
3. 它是不是品牌 logo？
4. 它是不是复杂插画或空态图？
5. 它是不是业务媒体图片？

### 步骤 2：决定资源来源

- 常见操作图标：icon library
- 业务识别图标：自有 SVG
- 品牌 logo：自有 SVG / 主题变体
- 空态图：自有 SVG 或轻量插画资源
- 业务媒体图片：继续走 Worker 提供的图片路径和缓存

### 步骤 3：决定显色策略

- 通用单色图标：`currentColor`
- 品牌图：固定色或深浅双版本
- 多色插画：`light / dark` 双资源
- 业务媒体图片：不染色

### 步骤 4：落目录与命名

命名建议：

- 导航业务图标：`nav-library.svg`
- 页面业务图标：`video-resource-status.svg`
- 空态图：`empty-favorites-light.svg`、`empty-favorites-dark.svg`
- 品牌图：`app-logo.svg`、`app-logo-dark.svg`
- 应用图标：按桌面壳打包要求放到 `src-tauri/icons/`

### 步骤 5：组件接线

- icon library 图标：组件内直接引用
- 自定义单色 SVG：作为组件引入，并保证主路径使用 `currentColor`
- 双主题插画：通过资源注册或主题判断切换
- 业务媒体图：走图片组件与占位兜底，不进入静态资产注册

## 推荐的资源注册方式

如果后续资源变多，建议增加一个轻量注册文件，例如：

- `src/assets/asset-registry.ts`

用于描述：

- `id`
- `kind`
- `themeAware`
- `lightSrc`
- `darkSrc`
- `tintable`

这样复杂资源不需要在每个页面里重复写切换逻辑。

## 轻量来源记录规则

当前项目属于个人使用阶段，不需要上重型法务流程；但为了后面不失忆，建议保留**最小记录**：

- 如果直接复用了第三方图片或 SVG：
  - 在资源文件同目录放一行备注，或
  - 在提交说明里写清来源链接和用途，或
  - 在 `asset-registry.ts` 的注释里留来源
- 如果只是参考风格自行重绘，不需要额外做复杂记录。

换句话说：

- **不搞重流程**
- **但也不要完全零记录**

## 当前不建议的做法

- 为了省事，把所有 icon 都截图或导出成 PNG
- 用运行时滤镜强行把多色插画染成暗色版
- 给品牌 logo 直接套通用 icon 颜色
- 在每个页面组件里自己判断一遍主题并重复写资源切换
- 让业务媒体图片跟着主题变色

## 回归点

- 常见操作图标在双主题下始终清晰可见。
- 自定义 SVG 在 hover、active、danger 状态下显色稳定。
- 空态图在深浅色背景下对比度足够，不发灰不脏。
- Poster / Thumb / Fanart 保持原图色彩，不因主题切换失真。
- 新增资源时，团队能按同一判断路径快速决定“放哪、怎么显色、是否要双版本”。
