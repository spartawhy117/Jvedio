# 样式与主题

## 范围

| 区域 | 文件 |
|--|--|
| 样式管理 | `Jvedio-WPF/Jvedio/CustomStyle/StyleManager.cs` |
| 第三方样式承接 | `Jvedio-WPF/Jvedio/CustomStyle/SuperControls/` |

## 负责内容

- 高亮色与通用样式入口
- 主题切换承接
- 与 `SuperControls.Style` 的样式桥接

## 改动入口

- 新主题或颜色策略：`StyleManager`
- UI 统一外观问题：优先检查主题配置与样式资源

## 当前性能 / Bug 问题

- 当前样式模块问题不多，主要风险在于外部样式库升级后的兼容性
- 样式逻辑分散在本地代码和外部库之间，定位问题时要跨两边看
