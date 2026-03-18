# Open Questions

## 当前阻断项（Phase 6 进入前必须解决）

### OQ-1: Worker.exe 编译
- **状态**: 待验证
- **问题**: `Jvedio.Worker.exe` 不存在于 `bin/Release/net8.0/`，需要 .NET 8 SDK 和 `dotnet build -c Release`
- **前提**: .NET 8 SDK 已安装
- **解决方案**: `cd Jvedio-WPF/Jvedio.Worker && dotnet build -c Release`

### OQ-2: Rust toolchain
- **状态**: 待验证
- **问题**: Tauri dev 模式需要 Rust 编译器，`target/debug/` 不存在说明从未以 debug 模式编译过
- **前提**: Rust stable toolchain 已安装
- **解决方案**: `rustup update stable` + 首次 `tauri dev` 会自动触发编译

### OQ-3: 前端代码与 Worker API 的匹配度
- **状态**: 未验证
- **风险**: 前端 `api/types.ts` 中的 DTO 是在 Phase 2 期间基于 Contracts 代码手工镜像的，从未与真实 Worker 响应做过对照。可能存在：
  - 字段名大小写不匹配（C# PascalCase vs JSON camelCase）
  - 缺失字段或多余字段
  - 枚举值表示差异
- **验证方式**: 启动后在 DevTools Network 面板对照真实 API 响应

## 已冻结决策（无需再讨论）

- 新壳目录: `tauri/`
- Renderer 主线: `React + TypeScript`
- Worker 策略: 动态端口
- UI 输入: `doc/UI/new/`
- 主题/多语言/图片显色: `doc/UI/new/foundation/`
- Electron: 已物理删除
