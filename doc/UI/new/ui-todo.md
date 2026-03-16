# Desktop UI TODO

本清单用于收口当前 exe UI 文档资产。

## 当前执行顺序

- [x] 建立页面总索引，列出所有页面图片、文档和极简功能说明
- [x] 收口现有页面图片中的说明性文案，并把对应功能说明补入文档
- [x] 补 `categories-page` 图片与文档
- [x] 补 `series-page` 图片与文档
- [x] 补 `actor-detail-page` 图片与文档
- [x] 补 `video-detail-page` 图片与文档
- [x] 补 `create-edit-library-dialog` 图片与文档
- [x] 补 `delete-library-dialog` 图片与文档
- [x] 补 `task-detail-dialog` 图片与文档
- [x] 补 `shared-components` 图片并扩充共享组件文档
- [x] 更新 `README.md`，同步正式页面与弹层清单
- [x] 更新 `CHANGELOG.md` 记录本轮 UI 文档收口
- [x] 按页面粒度分次提交并推送
- [x] 最后执行 Release 构建验证

## 当前结果

- 当前正式页面、弹层与共享组件均已补齐图片和文档。
- 现有页面图片中的大段功能说明已经迁移到对应 `.md`，图片只保留结构、控件和最小标签。
- 本轮已完成 Release 构建验证，未运行集成测试，因为本轮仅涉及 UI 文档、线框和说明文件收口。

## 收口规则

- 已有页面图片中不再保留大段功能说明文字。
- 功能、数据来源、状态、交互规则统一写入 `.md` 文档。
- 新增页面或弹层文档时，必须同步产出 `.png` 和 `.excalidraw`。
- 页面命名、图片命名、文档命名保持完全一致。
