# Actors 页规格

## 页面定位

- Actors 是左侧一级导航重点页。
- 负责全库演员聚合浏览，而不是某个库的局部演员页。
- 本页在 renderer 中对应 `features/actors/pages/ActorsPage.tsx`。

## 主要能力

- 搜索演员
- 按名字排序
- 按影片数量排序
- 按首字母或拼音索引筛选
- 列表 / 卡片切换
- 展示演员头像、名字、影片数量
- 进入演员关联影片列表或详情

## 页面级组件

- `ActorsPage.tsx`
  - 负责查询参数与分页状态
- `ActorsToolbar.tsx`
  - 承接搜索、排序、首字母 / 拼音筛选、视图切换
- `ActorGrid.tsx`
  - 卡片视图
- `ActorList.tsx`
  - 列表视图
- `ActorVideoDrawer.tsx`
  - 展示演员关联影片结果

## Section 结构

- 页面头部
  - 共享组件：
    - `PageHeader`
  - 内容：
    - 页面标题
    - 聚合说明
- 控制栏
  - 页面组件：
    - `ActorsToolbar.tsx`
  - 内容：
    - 搜索框
    - 排序
    - 首字母 / 拼音索引
    - 视图切换
- 结果区
  - 页面组件：
    - `ActorGrid.tsx`
    - `ActorList.tsx`
  - 内容：
    - 头像
    - 名称
    - 作品数
    - 空状态
    - 错误状态
- 下钻区
  - 页面组件：
    - `ActorVideoDrawer.tsx`
  - 内容：
    - 演员关联影片列表
    - 打开详情入口

## 页面状态

- `useActorsFilters.ts`
  - `keyword`
  - `sortBy`
  - `sortOrder`
  - `alphabet`
  - `viewMode`
  - `pageIndex`
- 页面级状态：
  - `selectedActorId`
  - `isDrawerOpen`
  - `isLoading`
  - `error`

## API 依赖

- `GET /api/actors`
  - 获取演员聚合结果
- `GET /api/actors/{actorId}/videos`
  - 获取演员关联影片
- `GET /api/events`
  - 订阅演员头像或聚合变更的刷新信号

## 第一阶段重点

- 保留现有演员聚合与搜索语义。
- 不扩展演员编辑能力。
- 不扩展复杂收藏或关系编辑能力。

## 第三批实现边界

- 本批要完成：
  - 搜索
  - 排序
  - 首字母 / 拼音筛选
  - 卡片 / 列表视图切换
  - 抽屉查看关联影片
- 本批不进入：
  - 独立演员详情页
  - 演员编辑
  - 演员收藏体系

## 数据来源

- 当前来源：
  - `ActorList` 与演员相关聚合逻辑
- 目标来源：
  - Worker `actors` API
