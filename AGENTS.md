# AGENTS.md

## 仓库概览
- 仓库根目录：`D:\study\Proj\Jvedio`
- 主解决方案：`Jvedio-WPF/Jvedio.sln`
- 主程序项目：`Jvedio-WPF/Jvedio/Jvedio.csproj`
- 测试工程：`Jvedio-WPF/Jvedio.Test/Jvedio.Test.csproj`
- 当前主线：WPF 桌面端 + MetaTube 唯一搜刮源

## 构建命令

### 主程序 Debug
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" Jvedio.sln -target:Build -property:Configuration=Debug -maxcpucount
```

### 主程序 Release
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" Jvedio.sln -target:Build -property:Configuration=Release -maxcpucount
```

主程序输出：
- `Jvedio-WPF/Jvedio/bin/Release/Jvedio.exe`

### 测试工程 Release
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\MSBuild\Current\Bin\MSBuild.exe" Jvedio.Test.csproj -target:Build -property:Configuration=Release -maxcpucount
```

### 跑全量测试
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TestWindow\vstest.console.exe" "D:\study\Proj\Jvedio\Jvedio-WPF\Jvedio.Test\bin\Release\Jvedio.Test.dll"
```

### 跑单个测试
```powershell
"C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\IDE\CommonExtensions\Microsoft\TestWindow\vstest.console.exe" "D:\study\Proj\Jvedio\Jvedio-WPF\Jvedio.Test\bin\Release\Jvedio.Test.dll" /Tests:CanWarmupMetaTubeServer
```

## 测试脚本入口
- MetaTube：`Jvedio-WPF/Jvedio.Test/config/meta-tube/run-meta-tube-tests.ps1`
- 扫描链：`Jvedio-WPF/Jvedio.Test/config/scan/run-scan-tests.ps1`
- 全量：`Jvedio-WPF/Jvedio.Test/config/run-all-tests.ps1`

支持：
- 双击运行
- 命令行运行时加 `-NoPause`

## 测试配置目录
- `Jvedio-WPF/Jvedio.Test/config/meta-tube/`
- `Jvedio-WPF/Jvedio.Test/config/scan/`

配置文件：
- `config/meta-tube/meta-tube-test-config.json`
- `config/scan/scan-test-config.json`

## 测试日志与输出
测试主日志：
- `Jvedio.Test/bin/Release/data/<user>/log/<yyyy-MM-dd>.log`

测试输出：
- MetaTube：`Jvedio.Test/config/meta-tube/output/`
- Scan：`Jvedio.Test/config/scan/output/`

## 当前关键目录规则
正式 sidecar：
- 写入影片目录
- 命名规则：
  - `<VID>.nfo`
  - `<VID>-poster.jpg`
  - `<VID>-thumb.jpg`
  - `<VID>-fanart.jpg`

正式缓存：
- `data/<user>/cache/video/`
- `data/<user>/cache/actor-avatar/`

测试输出：
- `data/<user>/log/test/<VID>/`

扫描整理：
- 平铺影片会自动整理到独立目录
- 整理失败的影片：
  - 跳过
  - 不继续搜刮
  - 继续后续影片

## 代码风格
- 保持当前 WPF + code-behind + ViewModel 混合风格
- 命名：
  - 类/方法/属性：PascalCase
  - 局部变量：camelCase
- 强类型优先，边界层可做兼容字典转换
- 不引入无用 using
- 变更尽量最小化，不做无关重构
- 错误不要吞掉，关键流程必须写日志
- 多步骤链路日志建议带语义前缀：
  - `[MetaTube-Test]`
  - `[Library-Organize]`

## 修改后必须执行
1. 更新相关文档
2. 重新生成 Release
3. 运行受影响测试
4. 必要时跑全量测试
5. 确认输出目录/日志符合预期
6. 再提交和推送

## 文档索引
- 开发总览：`doc/developer.md`
- MetaTube 历史计划归档：`plan/archive/metatube-only-plan/README.md`
- 测试目标文档：`doc/test-targets.md`
- 测试计划文档：`doc/test-plan.md`
- 当前测试清单：`doc/test-current-suite.md`
- 变更日志：`doc/CHANGELOG.md`

## 增强规划工作流
- 复杂功能、跨模块修改、架构调整优先使用 `plan-todo` 模式。
- 项目级 planning 结构统一放在 `plan/` 目录。
- 当前 feature 的主要工件：
  - `plan/active/<feature>/plan.json`
  - `plan/active/<feature>/plan.md`
  - `plan/active/<feature>/.plan-original.md`
  - `plan/active/<feature>/handoff.md`
- build 模式默认优先读取当前 feature 的 `handoff.md`，只有在需要额外背景时再读取 `plan.json` 或 `plan.md`。
- 旧的计划或进度文档完成迁移后应收敛到 `plan/archive/` 或 `doc/_legacy/`，避免继续占用 `doc/` 主索引位置。
- 同一时间只维护一个 active feature；切换 feature 时优先恢复已有 plan，而不是新建重复计划。
- 如果存在多个可行方案，必须输出单独的 `方案路径` 区块，并在用户明确确认前保持规划状态。
