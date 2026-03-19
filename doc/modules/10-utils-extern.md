# 工具与外部依赖

## 范围

| 区域 | 文件 |
|--|--|
| VID / 哈希工具 | `dotnet/Jvedio/Utils/Extern/JvedioLib.cs` |
| 值转换器 | `dotnet/Jvedio/Utils/Common/Converter.cs` |
| 扫描路径配置 | `dotnet/Jvedio/Utils/Config/ScanPathConfig.cs` |
| 最近观看配置 | `dotnet/Jvedio/Utils/Config/RecentWatchedConfig.cs` |

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

- `JvedioLib.cs` 已补齐 `JvedioLib.dll` 缺失或目标类型 / 方法缺失时的空保护，避免底层反射初始化直接抛错
- `Converter.cs` 已把布尔空判断从按位或改为逻辑或，避免不必要的双侧求值
- 外部依赖一旦行为变化，会直接放大到扫描、下载、UI 多条链路
- `Utils` 更偏底层支撑，修改时回归面通常大于改动范围
