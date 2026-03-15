# Electron 路线验证流程

## 阶段 A：方案与参考资产落地

- 确认 active feature 仍只有 `desktop-ui-shell-refactor`
- 确认 handoff 文档可独立恢复上下文
- 确认 Electron 文档层和 reference 文档层完整

## 第一批：库的新建和删除

- Home 页新建库
- Home 页删除库
- 左侧导航同步
- 数据持久化正确

## 第二批：扫描路径、扫描和拉取

- 配置默认扫描目录
- 触发扫描
- 整理与 MetaTube 抓取闭环
- sidecar 输出正确
- 任务状态可见

## 第三批：影片展示和播放

- Library 页展示影片
- Detail 页展示详情
- 播放调用成功
- 播放写回成功

## 第四批：设置页面

- 设置入口可用
- 设置值展示正确
- 保存、应用、恢复默认正确
- 配置能被业务消费

## 验证方式建议

- Worker 单元测试
- Worker 集成测试
- Electron E2E
- 阶段化人工验证清单
