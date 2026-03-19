# E2E 测试数据规范

## 1. 文档目的

本文档记录当前 E2E 播种与后端验收所使用的真实默认配置、真实产物路径，以及 `seed-e2e-data.ps1` + `verify-backend-apis.ps1` 已经跑通后的结论。

关联文档：

- [doc/data-directory-convention.md](doc/data-directory-convention.md)
- [doc/testing/backend/test-targets.md](doc/testing/backend/test-targets.md)
- [test-data/config/README.md](test-data/config/README.md)

## 2. 目录结构

E2E 数据根目录固定为 `{repo}/test-data/e2e/`。运行 `seed-e2e-data.ps1` 时，`JVEDIO_APP_BASE_DIR` 会指向这里，Worker 在测试环境下固定使用 `test-user` 作为有效用户目录。

```text
{repo}/test-data/e2e/
├─ data/
│  └─ test-user/
│     ├─ app_datas.sqlite
│     ├─ app_configs.sqlite
│     └─ cache/
│        ├─ video/
│        │  ├─ E2E-Lib-A/{VID}/
│        │  └─ E2E-Lib-B/{VID}/
│        └─ actor-avatar/
└─ videos/
   ├─ lib-a/
   └─ lib-b/
```

说明：

- `videos/` 是扫描输入目录
- `data/test-user/cache/video/` 是测试环境 sidecar 输出目录
- `data/test-user/cache/actor-avatar/` 是演员头像缓存目录
- 正式环境与测试环境路径不同，不应把测试环境 sidecar 不在 `videos/` 目录误判为异常

## 3. 当前默认测试样本

当前仓库默认配置来自 [test-env.json](test-data/config/test-env.json)：

```json
{
  "metaTube": {
    "serverUrl": "https://metatube-server.hf.space",
    "requestTimeoutSeconds": 60
  },
  "seedVideos": {
    "libA": ["SNOS-037.mp4", "SDDE-759.mp4"],
    "libB": ["sdde-660-c", "FC2-PPV-1788676.mp4"]
  },
  "scrapeableVids": ["SNOS-037", "SDDE-759"]
}
```

样本分组：

| 分类 | 输入样本 | 真实 VID / 预期 |
|------|----------|-----------------|
| 成功抓取 | `SNOS-037.mp4` | `SNOS-037`，应生成完整 sidecar 四件套 |
| 成功抓取 | `SDDE-759.mp4` | `SDDE-759`，应生成完整 sidecar 四件套 |
| 正常识别 | `sdde-660-c` | 应识别为 `SDDE-660-C`，不能当作无效输入 |
| 失败抓取 | `FC2-PPV-1788676.mp4` | 应保留影片并只生成 stub `.nfo` |

## 4. 播种与 verify 的真实链路

### 4.1 `seed-e2e-data.ps1`

脚本职责：

1. 读取默认配置和本地覆盖配置。
2. 准备 `videos/lib-a` 与 `videos/lib-b`。
3. 对无扩展名样本做规范化，保证能进入扫描链。
4. 启动 Worker，并通过 API 创建两个媒体库：
   - `E2E-Lib-A`
   - `E2E-Lib-B`
5. 分别执行扫描和抓取。
6. 通过 `/api/tasks/{id}` 轮询等待任务完成。
7. 写出 `e2e-env.json`，供 verify 和其他测试脚本直接消费。

当前 `e2e-env.json` 的关键字段：

```json
{
  "effectiveUserName": "test-user",
  "userDataRoot": "D:\\study\\Proj\\Jvedio\\test-data\\e2e\\data\\test-user",
  "videoCacheRoot": "D:\\study\\Proj\\Jvedio\\test-data\\e2e\\data\\test-user\\cache\\video",
  "actorAvatarCacheRoot": "D:\\study\\Proj\\Jvedio\\test-data\\e2e\\data\\test-user\\cache\\actor-avatar",
  "libraries": [
    { "name": "E2E-Lib-A", "libraryId": "1" },
    { "name": "E2E-Lib-B", "libraryId": "2" }
  ],
  "expectedVids": {
    "recognized": "SDDE-660-C",
    "expectedFailure": "FC2-PPV-1788676",
    "scrapeSuccess": ["SNOS-037", "SDDE-759"]
  }
}
```

### 4.2 `verify-backend-apis.ps1`

脚本职责：

1. 读取 `e2e-env.json`，不再自行猜测用户目录和缓存路径。
2. 按当前 `ApiResponse<T>` 结构校验 Worker API。
3. 先读 settings，再构造完整 `UpdateSettingsRequest` 做更新验证。
4. 校验视频、演员、任务、媒体库等返回结构。
5. 对播种样本做 sidecar、`scrapeStatus`、演员信息和目录检查。

当前 verify 的实跑结果：

```text
36 PASS / 2 SKIP / 0 FAIL
```

两个 skip 都是删除端点，目的是保护播种环境，不属于失败。

## 5. 真实跑通后的验证结果

### 5.1 扫描输入目录

扫描输入目录位于：

```text
test-data/e2e/videos/lib-a/
test-data/e2e/videos/lib-b/
```

这两个目录用于扫描与整理，不用于 sidecar 最终落盘。

### 5.2 `test-user` 下的真实产物路径

```text
test-data/e2e/data/test-user/cache/video/E2E-Lib-A/SNOS-037/
├─ SNOS-037.nfo
├─ SNOS-037-poster.jpg
├─ SNOS-037-thumb.jpg
└─ SNOS-037-fanart.jpg

test-data/e2e/data/test-user/cache/video/E2E-Lib-A/SDDE-759/
├─ SDDE-759.nfo
├─ SDDE-759-poster.jpg
├─ SDDE-759-thumb.jpg
└─ SDDE-759-fanart.jpg

test-data/e2e/data/test-user/cache/video/E2E-Lib-B/SDDE-660-C/
├─ SDDE-660-C.nfo
├─ SDDE-660-C-poster.jpg
├─ SDDE-660-C-thumb.jpg
└─ SDDE-660-C-fanart.jpg

test-data/e2e/data/test-user/cache/video/E2E-Lib-B/FC2-PPV-1788676/
└─ FC2-PPV-1788676.nfo

test-data/e2e/data/test-user/cache/actor-avatar/
└─ *.jpg
```

### 5.3 成功样本的正确结果

成功样本：

- `SNOS-037`
- `SDDE-759`
- `SDDE-660-C`

应满足：

- `GET /api/libraries/{id}/videos` 中 `title` 非空
- `scrapeStatus = "full"`
- `GET /api/videos/{videoId}` 中 `data.video.actors` 至少 1 条，且演员名非空
- sidecar 四件套存在
- 演员头像缓存存在

### 5.4 失败样本的正确结果

失败样本：

- `FC2-PPV-1788676`

应满足：

- 影片仍在库中
- `scrapeStatus = "failed"`
- 仅存在 `FC2-PPV-1788676.nfo`
- 不存在 `FC2-PPV-1788676-poster.jpg`
- 不存在 `FC2-PPV-1788676-thumb.jpg`
- 不存在 `FC2-PPV-1788676-fanart.jpg`

### 5.5 脚本输出应该表达什么

默认配置下，脚本结论应归纳为：

```text
SNOS-037     => scrapeStatus=full, actors present, full sidecar
SDDE-759     => scrapeStatus=full, actors present, full sidecar
SDDE-660-C   => recognized from sdde-660-c, scrapeStatus=full, full sidecar
FC2-PPV-1788676 => scrapeStatus=failed, stub nfo only
verify-backend-apis => 36 PASS / 2 SKIP / 0 FAIL
```

## 6. 当前接口结构口径

两个脚本现在都按下面的结构读取：

```text
GET /api/libraries
└─ data.libraries[]

POST /api/libraries
└─ data.library.libraryId

GET /api/libraries/{id}/videos
└─ data.items[]

POST /api/libraries/{id}/scan
└─ data.task

POST /api/libraries/{id}/scrape
└─ data.task

GET /api/videos/{id}
└─ data.video

GET /api/actors
└─ data.items[]

GET /api/tasks
└─ data.tasks[]

GET /api/settings
└─ data.general / data.image / data.scanImport / data.playback / data.library / data.metaTube
```

不再使用下列旧读法：

```text
data.dbId
data[]
只提交 settings 半包体
把 GET /api/videos/{id} 当成 data 直接读
```

## 7. 清理

清理脚本仍然是 `test-data/scripts/cleanup-e2e-data.ps1`，负责：

1. 停止 Worker。
2. 清理或重置 `test-data/e2e/data/` 与 `videos/`。
3. 清理测试日志。

## 8. 维护规则

- 默认样本变更时，同步更新本文档第 3 节和第 5 节。
- `e2e-env.json` 字段变更时，同步更新本文档第 4 节。
- `verify-backend-apis.ps1` 验收结果变化时，同步更新本文档第 4.2 节。
- 如果真实产物路径变化，先更新 `doc/data-directory-convention.md`，再更新本文档。
