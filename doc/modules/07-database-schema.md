# 数据库结构

![配置与持久化](../assets/diagrams/config-persistence.svg)

## 主分层

| 层 | 作用 | 入口 |
|--|--|--|
| 配置库 | 保存程序配置 | `app_configs` |
| 应用数据 | 库信息、搜索历史、磁链、标签等 | `Sqlite.AppData` |
| 内容数据 | 元数据、视频、图片、关系表 | `Sqlite.Data` |
| 演员数据 | 演员基础信息 | `Sqlite.Actor` |

## 关键表

| 表 | 说明 |
|--|--|
| `app_configs` | 全部配置项键值存储 |
| `app_databases` | 媒体库定义、扫描路径、访问次数 |
| `metadata` | 统一元数据主表 |
| `metadata_video` | 视频专有字段 |
| `actor_info` | 演员信息 |
| `common_association` | 条目关联 |
| `common_magnets` | 磁链 |
| `common_search_histories` | 搜索历史 |

## 关系特点

- `metadata` 是主表
- 视频、图片、漫画、游戏等通过各自扩展表补字段
- 演员、标签、标记戳通过中间表关联
- `DBId` 将记录绑定到当前媒体库

## 改动入口

- 新表 / 新列：`Jvedio-WPF/Jvedio/Core/DataBase/Tables/Sqlite.cs`
- 初始化：`Jvedio-WPF/Jvedio/Mapper/MapperManager.cs`
- 查询实现：对应 `Mapper/*.cs`

## 当前性能 / Bug 问题

- 查询表连接较多，列表页分页与筛选容易放大 SQL 成本
- 上层拼接 SQL 较多，复杂查询一致性依赖调用方
- 跨表关系多，字段调整时回归范围大
- 已为 `metadata (DBId,DataType,ViewCount)` 补充索引，改善按播放次数排序时的数据库支撑能力
