# Video Detail 页规格

## 页面定位

- 展示单个影片的详情信息。
- 承接播放入口。
- 本页在 renderer 中对应 `features/video-detail/pages/VideoDetailPage.tsx`。

## 主要能力

- 展示基础元数据
- 展示演员信息
- 展示图片与路径
- 打开外部链接
- 调用播放
- 打开文件所在目录
- 手动刷新元数据与 sidecar 状态

## 页面级组件

- `VideoDetailPage.tsx`
  - 负责数据拼装、错误边界和路由参数
- `VideoHeroSection.tsx`
  - 标题、番号、评分、年份、主图
- `VideoActionBar.tsx`
  - 播放、打开目录、手动刷新
- `VideoMetadataSection.tsx`
  - 基础信息键值块
- `VideoAssetsSection.tsx`
  - poster / thumb / fanart / sidecar 状态
- `VideoActorsSection.tsx`
  - 演员信息区
- `SidecarStatusCard.tsx`
  - sidecar 生成状态卡片

## Section 结构

- Hero 区
  - 页面组件：
    - `VideoHeroSection.tsx`
  - 内容：
    - 标题
    - VID
    - 评分
    - 年份
    - 时长
    - 主图
- 操作区
  - 页面组件：
    - `VideoActionBar.tsx`
  - 内容：
    - 播放
    - 打开目录
    - 手动刷新元数据
- 元数据区
  - 页面组件：
    - `VideoMetadataSection.tsx`
  - 内容：
    - 系列
    - 类别
    - 标签
    - 文件路径
    - 来源信息
- 演员区
  - 页面组件：
    - `VideoActorsSection.tsx`
  - 内容：
    - 演员头像
    - 演员名称
    - 关联入口
- 媒体资源区
  - 页面组件：
    - `VideoAssetsSection.tsx`
    - `SidecarStatusCard.tsx`
  - 内容：
    - poster
    - thumb
    - fanart
    - NFO 状态

## 页面状态

- `useVideoDetailData.ts`
  - `detail`
  - `playAvailability`
  - `assetState`
  - `isRefreshing`
  - `error`
- 页面级状态：
  - `activeAssetTab`
  - `isPlaying`

## API 依赖

- `GET /api/videos/{videoId}`
  - 获取详情
- `POST /api/videos/{videoId}/play`
  - 调用外部播放器
- `POST /api/videos/{videoId}/refresh-metadata`
  - 手动刷新元数据
- `POST /api/videos/{videoId}/open-folder`
  - 打开目录
- `GET /api/events`
  - 订阅刷新与播放结果事件

## 第三阶段重点

- 播放仍走当前外部播放器链。
- 不做内嵌播放器。
- 播放成功后要维持现有写回语义。

## 第三批实现边界

- 本批要完成：
  - 基础详情展示
  - 播放入口
  - 打开目录
  - 手动刷新元数据
  - 资源状态展示
- 本批不进入：
  - 内嵌播放器
  - 复杂图片编辑
  - 深度外链跳转整合

## 数据来源

- 当前来源：
  - 视频实体与详情窗口相关能力
- 目标来源：
  - Worker `videos` API
