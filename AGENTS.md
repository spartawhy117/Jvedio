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

补充规则：
- 如果本轮只修改文档、说明文字、规划内容或其他纯内容文件，且不涉及 MetaTube 抓取链、扫描导入链、测试脚本或相关实现代码，则最后可以不跑 `Jvedio.Test` 的集成测试。
- 上述纯内容修改场景下，仍需至少完成 Release 构建，并在提交说明里明确“未跑集成测试”的原因。

## 文档索引
- 开发总览：`doc/developer.md`
- MetaTube 历史计划归档：`plan/archive/metatube-only-plan/README.md`
- 测试目标文档：`doc/test-targets.md`
- 测试计划文档：`doc/test-plan.md`
- 当前测试清单：`doc/test-current-suite.md`
- 变更日志：`doc/CHANGELOG.md`

## UI 文档规则
- 当前 exe UI 实施文档统一以 `doc/UI/new/` 为准。
- 当前项目所有正式 UI 线框图、弹层图、共享组件图、流程图统一采用白色背景底图方案，不再输出深色底图或暗色画布版本。
- 线框图只负责表达布局、层级和主要视觉关系，不承担完整功能说明。
- 每个页面规格文档至少应包含以下章节：
  - `页面目的`
  - `页面范围`
  - `数据来源`
  - `元素清单`
  - `交互规则`
  - `状态定义`
  - `性能与体验约束`
  - `回归点`
- 共享组件、通用弹窗、行内动作条、状态 badge 等通用规则优先收敛到共享文档，不要在每个页面文档里重复写散。
- 如果某功能当前没有稳定实现链路，不要只因为旧图或旧方案存在，就继续在新 UI 文档里画成可点击主入口；应在文档中明确标注为“当前不保留”或“暂不接线”。

## 增强规划工作流
- 复杂功能、跨模块修改、架构调整优先使用 `plan-todo` 模式。
- 项目级 planning 结构统一放在 `plan/` 目录。
- 当前 active feature 默认采用轻量工件结构：
  - `plan/active/<feature>/plan.md`
  - `plan/active/<feature>/handoff.md`
- 可选工件：
  - `plan/active/<feature>/open-questions.md`
  - `plan/active/<feature>/validation.md`
- `plan/active/<feature>/plan.json` 仅作为工具元数据，不承载正文叙事；只有工具确有需要时才维护。
- build 模式默认优先读取当前 feature 的 `handoff.md`；需要更多背景时再读取 `plan.md`；涉及未决项或回归范围时再读 `open-questions.md` / `validation.md`。
- 旧的计划或进度文档完成迁移后应收敛到 `plan/archive/` 或 `doc/_legacy/`，避免继续占用 `doc/` 主索引位置。
- 同一时间只维护一个 active feature；切换 feature 时优先恢复已有 plan，而不是新建重复计划。
- 如果存在多个可行方案，必须输出单独的 `方案路径` 区块，并在用户明确确认前保持规划状态。
