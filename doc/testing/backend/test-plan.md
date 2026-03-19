# 测试计划文档

## 1. 文档目的

本文件定义当前测试工程的组织方式、配置方式、输出方式、执行方式和扩展方式。

它回答的问题是：
- 测试工程怎么搭？
- 配置文件放哪？
- 输出目录怎么组织？
- 脚本怎么运行？
- 新增模块测试时要怎么落地？

本文件不负责定义测试目标与断言边界；这些内容统一放在：
- `doc/testing/backend/test-targets.md`

本文件也不负责维护当前测试清单；当前已实现的测试项统一放在：
- `doc/testing/backend/test-current-suite.md`

## 2. 当前测试工程结构

```text
Jvedio.Worker.Tests/
├─ ContractTests/
│  ├─ ActorApiTests.cs          ← /api/actors 端点契约测试
│  ├─ BootstrapApiTests.cs      ← /api/bootstrap 端点契约测试
│  ├─ DtoSerializationTests.cs  ← Contracts DTO 序列化/反序列化测试
│  ├─ LibrariesApiTests.cs      ← /api/libraries 端点契约测试
│  ├─ ScrapeApiTests.cs         ← /api/libraries/{id}/scrape + MetaTube 诊断契约测试
│  ├─ SettingsApiTests.cs       ← /api/settings 端点契约测试
│  └─ VideosApiTests.cs         ← /api/videos 端点契约测试
├─ scripts/
│  ├─ run-all-tests.ps1
│  ├─ run-unit-tests.ps1
│  └─ run-integration-tests.ps1
├─ TestBootstrap.cs             ← WebApplicationFactory<Program> 初始化
└─ Jvedio.Worker.Tests.csproj   ← .NET 8 SDK-style 项目
```

说明：
- 测试工程使用 `WebApplicationFactory<Program>` 在进程内启动完整 Worker HTTP 管道
- 所有测试共享 `TestBootstrap` 中的 `HttpClient` 实例
- 每次测试运行使用临时目录中的空 SQLite 数据库，测试后自动清理
- 不依赖 WPF、不依赖外部网络服务

## 3. 当前测试分层

### 3.1 契约测试（ContractTests）
- 通过 HTTP 调用 Worker API 端点
- 验证请求/响应格式、状态码、业务逻辑
- 在进程内运行，不需要外部进程

### 3.2 DTO 序列化测试
- 验证 `Jvedio.Contracts` 中的 DTO 在 System.Text.Json 下正确序列化/反序列化
- 确保前端 TypeScript 类型与后端 C# 类型一致

## 4. 测试数据策略

所有 52 个测试都是**自给自足**的，不需要开发者预先准备任何 VID 文件、库数据或 SQLite 数据库。根据测试类型，采用三种不同的数据构造方式：

### 4.1 纯函数测试 — 内联数据，不碰文件系统

**适用测试**：`VidParsingTests`（17 个）、`SidecarPathTests`（6 个）

这类测试验证的是纯逻辑（字符串解析、路径拼接），不涉及数据库或文件系统。

数据构造方式：
- VID 解析：测试数据写在 `[DataRow]` 注解中，直接传字符串给被测方法
- Sidecar 路径：硬编码路径字符串（如 `"C:\videos\ABP-001\ABP-001.mp4"`），文件不需要真的存在
- 通过反射调用 `LibraryScanService.ExtractVideoId`、`LibraryScrapeService.GetMovieNfoPath` 等私有静态方法

```csharp
// 示例：VID 解析 — 数据全在注解里
[DataRow("ABP-001.mp4", "ABP-001", "标准 VID")]
[DataRow("FC2-PPV-1234567.mp4", "FC2-PPV-1234567", "FC2 标准格式")]
public void ExtractVideoId_StandardVids(string fileName, string expectedVid, string description)
{
    Assert.AreEqual(expectedVid, ExtractVideoId(fileName), description);
}
```

### 4.2 临时文件测试 — 每次自建，用完即删

**适用测试**：`ScanOrganizeTests`（5 个）

这类测试需要真实的文件系统来验证文件移动、目录创建等行为。

数据构造方式：
- `[TestInitialize]` 在系统临时目录创建 GUID 命名的空目录
- 测试方法中用 `File.WriteAllText` 创建假视频文件（内容为 `"dummy"`，几个字节）
- 假文件只要**文件名符合 VID 格式**即可，不需要是真正的视频
- `[TestCleanup]` 测试完成后删除整个临时目录

```csharp
// 示例：自建假视频文件
var videoPath = Path.Combine(testRoot, "ABP-001.mp4");
File.WriteAllText(videoPath, "dummy");  // 不是真视频，只是个文本文件
File.WriteAllText(Path.Combine(testRoot, "STARS-123.mp4"), "dummy2");
```

### 4.3 API 端到端测试 — 空库启动 + 测试方法内自建数据

**适用测试**：`ScanImportApiTests`（2 个）、所有契约测试（13 个）

这类测试依赖 `TestBootstrap` 启动的进程内 Worker 服务。

数据构造方式：
1. **`TestBootstrap`（全局初始化）**：创建空 SQLite 文件 → Worker 启动时 `StorageBootstrapper` 自动建表 → 数据库有表结构但无业务数据
2. **契约测试**：直接调 API 查空库，验证返回格式正确（如 `GET /api/videos/favorites` 返回空 `items` 数组）
3. **扫描导入测试**：测试方法内自建假视频文件（1024 字节）→ `POST /api/libraries` 创建库 → `POST /api/libraries/{id}/scan` 触发扫描 → 等待 3 秒 → `GET /api/libraries/{id}/videos` 验证导入结果
4. **测试完成后**：通过 `DELETE /api/libraries/{id}` 清理自己创建的库

```csharp
// 示例：扫描导入端到端 — 先造假文件，再通过 API 创建库和触发扫描
File.WriteAllBytes(Path.Combine(testRoot, "ABP-001.mp4"), new byte[1024]);
var createBody = JsonSerializer.Serialize(new { name = "Scan Test Library", scanPaths = new[] { testRoot } });
await TestBootstrap.Client.PostAsync("/api/libraries", ...);        // 创建库
await TestBootstrap.Client.PostAsync($"/api/libraries/{id}/scan", ...);  // 触发扫描
await Task.Delay(3000);                                              // 等待异步扫描完成
var videos = await TestBootstrap.Client.GetAsync($"/api/libraries/{id}/videos?..."); // 验证
```

### 4.4 数据策略总结

| 测试文件 | 数据来源 | 需要预配置 | 需要网络 |
|---------|---------|-----------|---------|
| `VidParsingTests` | `[DataRow]` 注解中的字符串 | ❌ | ❌ |
| `SidecarPathTests` | 硬编码路径字符串 | ❌ | ❌ |
| `ScanOrganizeTests` | `[TestInitialize]` 临时创建假文件 | ❌ | ❌ |
| `ScanImportApiTests` | 测试方法内造假文件 + API 创建库 | ❌ | ❌ |
| `ActorApiTests` | 空数据库 + 验证空态/404 响应格式 | ❌ | ❌ |
| `ScrapeApiTests` | 测试方法内创建临时库 + 不可达地址 | ❌ | ❌ |
| 契约测试（7 个文件） | 空数据库 + 测试方法内 API 调用 | ❌ | ❌ |

> **关键原则**：每个测试方法负责自己的数据生命周期（创建 → 使用 → 清理），不依赖其他测试的副作用，也不依赖任何外部环境。

## 5. 项目引用

```xml
<ProjectReference Include="..\Jvedio.Worker\Jvedio.Worker.csproj" />
<ProjectReference Include="..\Jvedio.Contracts\Jvedio.Contracts.csproj" />
```

- **不引用** `Jvedio.csproj`（WPF 主程序）
- 测试引擎：MSTest 3.x + Microsoft.NET.Test.Sdk + Microsoft.AspNetCore.Mvc.Testing

## 6. 测试基础设施

### TestBootstrap

`TestBootstrap.cs` 使用 `[AssemblyInitialize]` 在所有测试运行前：
1. 通过 `FindRepoRoot()` 定位 repo 根目录（向上查找包含 `dotnet/` 和 `tauri/` 的目录）
2. 清空并重建 `{repo}/test-data/worker/`，创建 `data/test-user/` 子目录
3. 放置空 SQLite 数据库文件
4. 设置 `JVEDIO_APP_BASE_DIR` = `{repo}/test-data/worker/`
5. 设置 `JVEDIO_LOG_DIR` = `{repo}/log/test/worker-tests/`（Worker 自动追加 `runtime/` 子目录）
6. 创建 `WebApplicationFactory<Program>` 和 `HttpClient`

`[AssemblyCleanup]` 在所有测试运行后：
1. 释放 HttpClient 和 Factory
2. **不删除** `test-data/worker/`，保留现场供调试和 git 跟踪

> 暴露 `TestBootstrap.TestDataDir` 属性，供需要创建临时文件的测试（如 `ScanImportApiTests`）使用。

### JSON 序列化

`TestBootstrap.JsonOptions` 使用 camelCase 命名策略，与 ASP.NET Core 默认行为保持一致。

## 7. 执行方式

### 命令行
```powershell
cd dotnet/Jvedio.Worker.Tests
dotnet test --configuration Release
```

### 运行单个测试
```powershell
dotnet test --configuration Release --filter "FullyQualifiedName~GetBootstrap_ReturnsSuccessEnvelope"
```

### 按类运行
```powershell
dotnet test --configuration Release --filter "FullyQualifiedName~BootstrapApiTests"
```

### PowerShell 脚本
- `scripts/run-all-tests.ps1` — 全量测试
- `scripts/run-unit-tests.ps1` — 仅序列化等纯单元测试
- `scripts/run-integration-tests.ps1` — 仅 API 集成测试

脚本支持：
- 双击执行
- 命令行加 `-NoPause` 参数

## 7. 推荐执行流程

### 7.1 开发期快速验证
1. 修改代码后 `dotnet build --configuration Release`
2. `dotnet test --configuration Release`
3. 确认全部通过

### 7.2 提交前全量验证
1. 运行 `scripts/run-all-tests.ps1`
2. 确认全部 52 个测试通过
3. 再进行提交

## 8. 新增模块测试流程

当新增一个功能模块测试时，建议按下面步骤做：

1. 判断测试分类：
   - ContractTests（API 端点）
   - DTO 序列化测试
   - 服务层单元测试（未来新增）
2. 在对应目录新增测试类文件
3. 使用 `TestBootstrap.Client` 发送 HTTP 请求
4. 使用 `TestBootstrap.JsonOptions` 处理 JSON
5. 更新：
   - `doc/testing/backend/test-current-suite.md`
6. 如果测试目标边界变了，再更新：
   - `doc/testing/backend/test-targets.md`
7. 如果目录结构、脚本、执行方式变了，再更新：
   - `doc/testing/backend/test-plan.md`

## 9. 文档更新规则

### 更新 `test-current-suite.md`
当测试清单发生变化时更新：
- 新增测试
- 删除测试
- 测试重命名
- 通过状态变化

### 更新 `test-targets.md`
当测试目标发生变化时更新：
- 新功能带来新的测试目标
- 老功能新增新的验收边界
- 强/弱断言变化

### 更新 `test-plan.md`
当测试工程结构和执行方式变化时更新：
- 新增测试类别
- 新增脚本
- 执行方式变化
- 项目引用变化

## 11. 技术债与后续演进

### 旧测试工程迁移评估

旧 `Jvedio.Test` 中以下测试用例的业务逻辑值得参考重写：

| 优先级 | 旧测试 | 方向 |
|--------|--------|------|
| P0 | LibraryOrganizerRuleTests / ScanTaskImportTests | 为 `LibraryScanService` 编写 VID 解析单元测试 |
| ~~P0~~ | ~~MetaTubeIntegrationTests~~ | ✅ 已完成：`ScrapeApiTests.cs`（3 个用例，Phase 9.6.3） |
| P1 | SidecarPathResolverTests | 为 Sidecar 路径命名规则编写单元测试 |
| P1 | LibraryOrganizeTests | 为扫描+整理全流程编写 Worker 层集成测试 |

以上均需重写（旧测试依赖 WPF 上下文，无法直接迁移），标记为技术债。

### 后续扩展建议

1. 增加 Worker 服务层单元测试（Mock 数据库）
2. 增加 SSE 事件流契约测试（`/api/events`）
3. ~~增加 MetaTube 诊断端点测试~~ ✅ 已完成（`ScrapeApiTests.MetaTubeDiagnostics_ReturnsResponseEnvelope`）
4. 增加错误响应格式验证
