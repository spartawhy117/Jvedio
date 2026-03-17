# Localization Spec

## 目的

- 冻结新桌面实现的多语言目录结构和初始化顺序。
- 明确当前只做 `zh` 与 `en` 时，文案资源应该如何组织。
- 避免把所有翻译堆进单个大文件，后续难以维护。

## 当前冻结结论

- 当前首批只做 `zh` 与 `en`。
- 实现方式参考 `clash-verge-rev` 的 `locales/{lang}/index.ts + *.json` 结构。
- 推荐采用 `i18next + react-i18next` 或等价方案。
- 文案按页面 / 模块拆分，不把全部 key 塞进一个 `common.json`。

## 推荐目录

建议结构：

- `src/locales/zh/index.ts`
- `src/locales/zh/common.json`
- `src/locales/zh/navigation.json`
- `src/locales/zh/library.json`
- `src/locales/zh/video.json`
- `src/locales/zh/actors.json`
- `src/locales/zh/settings.json`
- `src/locales/zh/dialogs.json`
- `src/locales/en/index.ts`
- `src/locales/en/common.json`
- `src/locales/en/navigation.json`
- `src/locales/en/library.json`
- `src/locales/en/video.json`
- `src/locales/en/actors.json`
- `src/locales/en/settings.json`
- `src/locales/en/dialogs.json`

规则：

- `index.ts` 只负责聚合，不承载大量正文文案。
- 页面文案尽量落到对应模块 json。
- 通用按钮、错误提示、时间单位等再进入 `common.json`。

## 初始化顺序

建议顺序：

1. 本地缓存语言
2. 用户设置中的语言
3. 系统 / 浏览器语言
4. fallback 语言 `zh`

理由：

- 先尊重用户已经切过的语言
- 再兼容未来设置页的持久化读写
- 没有明确选择时，优先按系统语言尝试
- 最后稳定回落到中文

## 语言切换流程

1. 启动阶段读取缓存语言。
2. 初始化 i18n 实例并注册 `zh` / `en` 资源。
3. 首屏渲染使用已解析出的当前语言。
4. 用户在设置页切换语言时：
   - 更新 i18n 当前语言
   - 写入本地缓存
   - 如设置接口承载语言偏好，则同步写回 Worker
5. 不要求整页刷新；允许页面级重渲染完成切换。

## Key 组织规则

- key 使用稳定的英文语义，不用中文句子当 key。
- 按模块分层，例如：
  - `navigation.libraryManagement`
  - `navigation.settings`
  - `library.filters.keyword`
  - `video.actions.play`
  - `settings.theme.dark`
- 不把页面标题、按钮文案、错误文案全部混在一个命名空间里。

## 页面与组件分工

- 页面文案：放在对应页面模块 json。
- 弹窗文案：优先放 `dialogs.json`。
- 导航、分页、通用按钮、状态词：优先放 `common.json` 或 `navigation.json`。
- badge 状态词要固定枚举，不在页面内自由拼接文案。

## 开发流程

新增文案时建议走以下步骤：

1. 先判断它属于哪个页面或模块。
2. 在 `zh` 对应 json 增加 key。
3. 同步在 `en` 对应 json 增加 key。
4. 页面里只引用 key，不直接写死字符串。
5. 如果这条文案会影响页面职责或按钮命名，再同步检查对应页面文档。

## 当前约束

- 当前阶段不追求一次性支持更多语言。
- 不做动态在线翻译。
- 不把 API 返回的业务错误直接裸显为唯一用户文案；前端应保留自己的展示文案层。
- 规格文档继续以中文为主，用来表达产品语义；实现层再负责 `zh / en` 映射。

## 回归点

- 启动时能正确解析出当前语言，不出现明显闪烁。
- 导航、设置页、弹窗、分页和状态文本在中英文下都可读。
- 中英文切换后，页面不出现明显 key 泄漏或未翻译占位。
- 新增页面文案时不会继续把所有 key 塞进单个文件。
