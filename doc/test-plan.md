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
- `doc/test-targets.md`

本文件也不负责维护当前测试清单；当前已实现的测试项统一放在：
- `doc/test-current-suite.md`

## 2. 当前测试工程结构

```text
Jvedio.Test/
├─ config/
│  ├─ meta-tube/
│  │  ├─ meta-tube-test-config.json
│  │  ├─ output/
│  │  └─ run-meta-tube-tests.ps1
│  ├─ scan/
│  │  ├─ scan-test-config.json
│  │  ├─ output/
│  │  └─ run-scan-tests.ps1
│  └─ run-all-tests.ps1
├─ IntegrationTests/
│  ├─ MetaTube/
│  └─ Scan/
├─ UnitTests/
│  └─ Core/
├─ ScanTest/
├─ Properties/
├─ TestBootstrap.cs
└─ TestAssemblyBootstrap.cs
```

## 3. 当前测试分层

### 3.1 快速验证
- 纯逻辑
- 不联网
- 运行快

### 3.2 网络验证
- 访问真实 MetaTube 服务
- 验证 warmup、搜索、详情、头像、输出

### 3.3 扫描链验证
- 模拟平铺目录
- 验证自动整理与跳过策略

## 4. 配置目录规则

### 4.1 MetaTube 配置
位置：
- `config/meta-tube/meta-tube-test-config.json`

输出：
- `config/meta-tube/output/`

脚本：
- `config/meta-tube/run-meta-tube-tests.ps1`

### 4.2 Scan 配置
位置：
- `config/scan/scan-test-config.json`

输出：
- `config/scan/output/`

脚本：
- `config/scan/run-scan-tests.ps1`

### 4.3 全量测试脚本
位置：
- `config/run-all-tests.ps1`

## 5. 主日志与 output 的关系

### 主日志位置
测试主日志写入：
- `Jvedio.Test/bin/Release/data/<user>/log/<yyyy-MM-dd>.log`

### suite 输出位置
测试业务输出写入：
- `config/meta-tube/output/`
- `config/scan/output/`

说明：
- 主日志仍按正式程序的日志路径工作
- suite 的 `output/` 只负责保存该类测试的业务输出文件
- 当前不将主日志迁移到 `config/<suite>/output/`

## 6. 配置文件说明

### 6.1 MetaTube 配置
字段重点：
- `enabled`
- `serverUrl`
- `requestTimeoutSeconds`
- `warmupBeforeScrape`
- `clearOutputBeforeRun`
- `testOutputRoot`
- `cacheRoot`
- `logToConsole`
- `cases`

说明：
- `cases` 中每个对象对应一个要测试的影片
- `testOutputRoot` 指向 MetaTube suite 输出目录
- `cacheRoot` 指向测试缓存目录

### 6.2 Scan 配置
字段重点：
- `enabled`
- `cleanOutputBeforeRun`
- `testRoot`
- `flatLibraryRoot`
- `cases`

说明：
- `cases` 中每个对象描述一个扫描整理场景
- `files` 表示待构造的平铺文件列表
- `expectOrganized / expectSkipped` 定义场景预期

## 7. PowerShell 脚本入口

### MetaTube
- `config/meta-tube/run-meta-tube-tests.ps1`

### Scan
- `config/scan/run-scan-tests.ps1`

### 全量
- `config/run-all-tests.ps1`

### 脚本行为
- 自动 build `Jvedio.Test`
- 自动运行对应测试
- 支持双击执行
- 支持参数：
  - `-NoPause`

## 8. 推荐执行流程

### 8.1 快速验证
1. build `Jvedio.Test`
2. 跑纯单元测试
3. 检查 sidecar/cache/path 逻辑

### 8.2 网络验证
1. 检查 `config/meta-tube/meta-tube-test-config.json`
2. 清理 `config/meta-tube/output/`
3. 跑 `run-meta-tube-tests.ps1`
4. 检查 output 和日志

### 8.3 扫描链验证
1. 检查 `config/scan/scan-test-config.json`
2. 清理 `config/scan/output/`
3. 跑 `run-scan-tests.ps1`
4. 检查目录整理结果

### 8.4 全量回归
1. 运行 `run-all-tests.ps1`
2. 确认全部测试通过
3. 再进行提交

## 9. 新增模块测试流程

当新增一个功能模块测试时，建议按下面步骤做：

1. 判断测试分类：
   - Unit / Integration / Scan
2. 新增测试类文件
3. 如需数据驱动，新增 `config/<suite>/xxx.json`
4. 如需输出文件，写入 `config/<suite>/output/`
5. 更新：
   - `doc/test-current-suite.md`
6. 如果测试目标边界变了，再更新：
   - `doc/test-targets.md`
7. 如果目录结构、脚本、执行方式变了，再更新：
   - `doc/test-plan.md`

## 10. 文档更新规则

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
- 新增 config
- 新增脚本
- 输出目录变更
- 测试流程变化

## 11. 后续演进建议

后续继续扩展测试体系时，优先级建议是：

1. 强化现有 18 个测试的断言
2. 增加更多 actor/avatar 场景
3. 增加多分段视频扫描整理场景
4. 增加图片下载失败容错验证
5. 保持脚本入口和 output 目录结构稳定
