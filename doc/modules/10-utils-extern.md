# 工具与外部依赖

## 范围

| 区域 | 文件 |
|--|--|
| VID / 哈希工具 | `Jvedio-WPF/Jvedio/Utils/Extern/JvedioLib.cs` |
| 值转换器 | `Jvedio-WPF/Jvedio/Utils/Common/Converter.cs` |
| 扫描路径配置 | `Jvedio-WPF/Jvedio/Utils/Config/ScanPathConfig.cs` |
| 最近观看配置 | `Jvedio-WPF/Jvedio/Utils/Config/RecentWatchedConfig.cs` |

## 负责内容

- 外部识别能力封装
- 哈希 / VID 识别
- WPF 绑定转换器
- 历史配置文件兼容

## 改动入口

- 识别规则问题：`JvedioLib.Identify`
- 哈希问题：`JvedioLib.Encrypt`
- 列表或类型展示：`Converter.cs`

## 当前性能 / Bug 问题

- 外部依赖一旦行为变化，会直接放大到扫描、下载、UI 多条链路
- `Utils` 更偏底层支撑，修改时回归面通常大于改动范围
