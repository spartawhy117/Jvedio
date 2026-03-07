# 配置与持久化

![配置与持久化](../assets/diagrams/config-persistence.svg)

## 范围

| 区域 | 文件 |
|--|--|
| 配置总入口 | `Jvedio-WPF/Jvedio/Core/Config/ConfigManager.cs` |
| 路径管理 | `Jvedio-WPF/Jvedio/Core/Config/PathManager.cs` |
| 数据库路径 | `Jvedio-WPF/Jvedio/Core/DataBase/SqlManager.cs` |
| Mapper 初始化 | `Jvedio-WPF/Jvedio/Mapper/MapperManager.cs` |
| 表结构 | `Jvedio-WPF/Jvedio/Core/DataBase/Tables/Sqlite.cs` |

## 负责内容

- 应用配置、窗口配置、任务配置读取与保存
- 数据目录、日志目录、备份目录、插件目录计算
- SQLite 路径生成
- Mapper 初始化与建表

## 关键对象

- `ConfigManager.Settings`
- `ConfigManager.ScanConfig`
- `ConfigManager.FFmpegConfig`
- `ConfigManager.ServerConfig`
- `PathManager`
- `MapperManager`

## 改动入口

- 新配置项：对应 `Config` 类 + `ConfigManager`
- 新字段：`Sqlite.cs` + `Entity` + `Mapper`
- 新目录规则：`PathManager` + `EnsurePicPaths()`

## 当前性能 / Bug 问题

- 配置和 Mapper 都是全局单例，模块耦合高
- 表结构、任务逻辑、UI 读写路径耦合紧密
- 复杂筛选和查询仍有不少 SQL 在上层动态拼接
