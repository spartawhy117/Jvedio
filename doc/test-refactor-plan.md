# 测试工程改造计划

## 目标

- 将 `Jvedio.Test` 从零散测试重构为“数据驱动 + 非 UI”测试体系
- 重点覆盖：
  - MetaTube 抓取
  - 影片详情转换
  - 演员头像拉取
  - cache 写入
  - sidecar 输出
  - 扫描库自动整理目录
- 降低 UI 测试优先级
- 为后续持续开发提供稳定回归链
- 增加“日志覆盖模式”的验证，避免单日日志无限增长

## 当前测试工程现状

当前纳入编译的测试只有：

- `ScanTest/ImportTest.cs`
- `UITest/Scan/ScanTest.cs`
- `UITest/TestBase.cs`
- `UnitTests/Core/Crawler/CrawlerServer.cs`

现状问题：

- UI 测试依赖 WinAppDriver，维护成本高
- `CrawlerServer` 测试是旧插件体系的空壳
- 扫描测试断言弱，未覆盖新整理逻辑
- 没有 MetaTube 相关测试

## 重构后的目标结构

```text
Jvedio.Test/
├─ IntegrationTests/
│  ├─ MetaTube/
│  │  ├─ MetaTubeIntegrationTests.cs
│  │  ├─ MetaTubeTestConfig.cs
│  │  └─ meta-tube-test-config.json
│  └─ Scan/
│     ├─ LibraryOrganizeTests.cs
│     ├─ ScanImportIntegrationTests.cs
│     └─ scan-test-config.json
├─ UnitTests/
│  ├─ Core/
│  │  ├─ Media/
│  │  ├─ Scraper/
│  │  └─ Scan/
├─ TestData/
│  ├─ FlatLibrary/
│  ├─ OrganizedLibrary/
│  ├─ SidecarExpected/
│  └─ Files/
├─ TestOutput/
│  ├─ MetaTube/
│  └─ Scan/
└─ Properties/
```

## 处理策略

### 保留并重构

- `ScanTest/ImportTest.cs`
  - 重构为扫描导入/自动整理链测试
- `Jvedio.Test.csproj`
  - 继续作为新的测试宿主

### 删除或降级

- `UnitTests/Core/Crawler/CrawlerServer.cs`
  - 删除或替换为 `ScraperProviderManager` 测试
- `UITest/Scan/ScanTest.cs`
  - 停用，不再作为当前主测试链
- `UITest/TestBase.cs`
  - 暂时保留，但不纳入主验证流程

## 阶段拆分

### 阶段 1：清理或降级旧测试

状态：`[x]`

目标：
- 删除旧 crawler 空壳测试
- 将 UI 测试降级为可选
- 保留扫描测试但准备重写

改动项：
- 删除或停用：
  - `UnitTests/Core/Crawler/CrawlerServer.cs`
  - `UITest/Scan/ScanTest.cs`
- 保留：
  - `UITest/TestBase.cs`
- 重构：
  - `ScanTest/ImportTest.cs`

执行记录：
- 已将 `UITest/Scan/ScanTest.cs` 从测试工程编译清单中移除
- 已将 `UITest/TestBase.cs` 从测试工程编译清单中移除
- 已将 `UnitTests/Core/Crawler/CrawlerServer.cs` 从测试工程编译清单中移除
- 当前测试工程主入口已收敛为 `ScanTest/ImportTest.cs`，为后续重写为扫描链测试做准备

### 阶段 2：建立 MetaTube 配置驱动测试

状态：`[x]`

目标：
- 建立不依赖 UI 的 MetaTube 集成测试链

新增文件：
- `IntegrationTests/MetaTube/MetaTubeIntegrationTests.cs`
- `IntegrationTests/MetaTube/MetaTubeTestConfig.cs`
- `IntegrationTests/MetaTube/meta-tube-test-config.json`

覆盖点：
- warmup
- movie search
- movie detail
- actor search
- actor detail
- cache
- test output

执行记录：
- 已新增 `MetaTubeIntegrationTests.cs`
- 已新增 `MetaTubeTestConfig.cs`
- 已新增 `meta-tube-test-config.json`
- 当前已覆盖 warmup、影片搜索、详情转换、头像验证和测试输出验证骨架

### 阶段 3：建立扫描链测试

状态：`[x]`

目标：
- 建立平铺影片自动整理和扫描导入回归链

新增文件：
- `IntegrationTests/Scan/LibraryOrganizeTests.cs`
- `IntegrationTests/Scan/ScanImportIntegrationTests.cs`
- `IntegrationTests/Scan/scan-test-config.json`

覆盖点：
- 平铺影片自动整理
- 字幕迁移
- 整理失败即跳过
- 整理成功后路径更新

执行记录：
- 已新增 `LibraryOrganizeTests.cs`
- 已新增 `ScanImportIntegrationTests.cs`
- 已新增 `scan-test-config.json`
- 当前已覆盖平铺影片整理、字幕迁移、整理失败跳过和路径更新骨架

### 阶段 4：补充纯单元测试

状态：`[x]`

目标：
- 让不依赖网络的核心逻辑能够快速回归

新增文件：
- `UnitTests/Core/Media/SidecarPathResolverTests.cs`
- `UnitTests/Core/Media/ActorAvatarPathResolverTests.cs`
- `UnitTests/Core/Scraper/MetaTubeCacheTests.cs`
- `UnitTests/Core/Scraper/ScrapeResultMappingTests.cs`
- `UnitTests/Core/Scan/LibraryOrganizerRuleTests.cs`

执行记录：
- 已新增 sidecar、actor-avatar、cache、scrape mapping、organizer 规则的单元测试骨架

### 阶段 5：日志覆盖模式测试

状态：`[x]`

目标：
- 验证启动程序时日志覆盖旧内容，而不是单日无限追加

新增文件：
- `UnitTests/Core/Logs/LoggerInitializationTests.cs`

覆盖点：
- 启动后日志文件被覆盖
- 当前运行仅保留本次会话日志

执行记录：
- 已新增 `LoggerInitializationTests.cs`
- 已在正式代码中实现 `Logger.ResetCurrentLog()` 并接入 `App.Init()`

## 执行优先级

建议按以下顺序实施：

1. 清理旧测试壳
2. 新增 MetaTube 集成测试
3. 新增扫描链测试
4. 新增纯单元测试
5. 补日志覆盖测试

## 提交建议

- 提交 1：清理旧测试与测试工程结构整理
- 提交 2：MetaTube 配置驱动集成测试
- 提交 3：扫描链与自动整理测试
- 提交 4：纯单元测试补齐
- 提交 5：日志覆盖测试与测试文档完善

## 当前进度

- [x] 阶段 1：清理旧测试
- [x] 阶段 2：MetaTube 集成测试
- [x] 阶段 3：扫描链测试
- [x] 阶段 4：纯单元测试
- [x] 阶段 5：日志覆盖测试
