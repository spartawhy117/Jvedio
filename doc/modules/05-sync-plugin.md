# 信息同步与插件

![同步与插件流程](../assets/diagrams/sync-flow.svg)

## 范围

| 区域 | 文件 |
|--|--|
| 下载任务 | `Jvedio-WPF/Jvedio/Core/Net/DownLoadTask.cs` |
| 下载调度 | `Jvedio-WPF/Jvedio/Core/Net/VideoDownLoader.cs` |
| 插件加载 | `Jvedio-WPF/Jvedio/Core/Plugins/Crawler/CrawlerManager.cs` |
| 站点模型 | `Jvedio-WPF/Jvedio/Core/Crawler/CrawlerServer.cs` |
| 设置入口 | `Jvedio-WPF/Jvedio/Windows/Window_Settings.xaml.cs` |

## 负责内容

- 爬虫插件发现与加载
- 站点 / 服务器选择
- 按 VID 抓取元数据
- 海报、缩略图、演员头像、预览图下载
- 代理、Headers、站点配置管理

## 改动入口

- 站点兼容：`VideoDownLoader`
- 插件加载：`CrawlerManager`
- 图片保存：`DownLoadTask`
- 站点配置：`ServerConfig` + 设置窗口

## 当前性能 / Bug 问题

- 插件加载仍然依赖反射与目录约定，但已优先选择与插件目录或元数据匹配的 DLL，降低误把依赖 DLL 当主插件加载的风险
- 下载任务将远程请求、文件写入、数据库更新混在一个对象里，维护复杂
- 插件和站点配置的错误仍可能在运行期才暴露
