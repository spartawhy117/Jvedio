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
│  ├─ BootstrapApiTests.cs      ← /api/bootstrap 端点契约测试
│  ├─ DtoSerializationTests.cs  ← Contracts DTO 序列化/反序列化测试
│  ├─ LibrariesApiTests.cs      ← /api/libraries 端点契约测试
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

## 4. 项目引用

```xml
<ProjectReference Include="..\Jvedio.Worker\Jvedio.Worker.csproj" />
<ProjectReference Include="..\Jvedio.Contracts\Jvedio.Contracts.csproj" />
```

- **不引用** `Jvedio.csproj`（WPF 主程序）
- 测试引擎：MSTest 3.x + Microsoft.NET.Test.Sdk + Microsoft.AspNetCore.Mvc.Testing

## 5. 测试基础设施

### TestBootstrap

`TestBootstrap.cs` 使用 `[AssemblyInitialize]` 在所有测试运行前：
1. 创建临时数据目录
2. 放置空 SQLite 数据库文件
3. 设置 `JVEDIO_APP_BASE_DIR` 和 `JVEDIO_LOG_DIR` 环境变量
4. 创建 `WebApplicationFactory<Program>` 和 `HttpClient`

`[AssemblyCleanup]` 在所有测试运行后：
1. 释放 HttpClient 和 Factory
2. 清理临时目录

### JSON 序列化

`TestBootstrap.JsonOptions` 使用 camelCase 命名策略，与 ASP.NET Core 默认行为保持一致。

## 6. 执行方式

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
2. 确认全部 13 个测试通过
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

## 10. 技术债与后续演进

### 旧测试工程迁移评估

旧 `Jvedio.Test` 中以下测试用例的业务逻辑值得参考重写：

| 优先级 | 旧测试 | 方向 |
|--------|--------|------|
| P0 | LibraryOrganizerRuleTests / ScanTaskImportTests | 为 `LibraryScanService` 编写 VID 解析单元测试 |
| P0 | MetaTubeIntegrationTests | 为 MetaTube 刮削全流程编写 Worker 层集成测试 |
| P1 | SidecarPathResolverTests | 为 Sidecar 路径命名规则编写单元测试 |
| P1 | LibraryOrganizeTests | 为扫描+整理全流程编写 Worker 层集成测试 |

以上均需重写（旧测试依赖 WPF 上下文，无法直接迁移），标记为技术债。

### 后续扩展建议

1. 增加 Worker 服务层单元测试（Mock 数据库）
2. 增加 SSE 事件流契约测试（`/api/events`）
3. 增加 MetaTube 诊断端点测试
4. 增加错误响应格式验证
