using System.Text.Json.Nodes;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Settings;

namespace Jvedio.Worker.Services;

public sealed class SettingsService
{
    private const string DefaultDiagnosticsVideoId = "IPX-001";
    private const string MetaTubeConfigName = "MetaTubeConfig";
    private const int MaxTimeoutSeconds = 300;
    private const int MinTimeoutSeconds = 15;
    private const string SettingsConfigName = "WindowConfig.Settings";

    private readonly ConfigStoreService configStoreService;
    private readonly ILoggerFactory loggerFactory;
    private readonly ILogger<SettingsService> logger;
    private readonly WorkerEventStreamBroker workerEventStreamBroker;

    public SettingsService(
        ConfigStoreService configStoreService,
        ILoggerFactory loggerFactory,
        ILogger<SettingsService> logger,
        WorkerEventStreamBroker workerEventStreamBroker)
    {
        this.configStoreService = configStoreService;
        this.loggerFactory = loggerFactory;
        this.logger = logger;
        this.workerEventStreamBroker = workerEventStreamBroker;
    }

    public GetSettingsResponse GetSettings()
    {
        return BuildSettingsSnapshot();
    }

    public UpdateSettingsResponse UpdateSettings(UpdateSettingsRequest request)
    {
        var snapshot = request.ResetToDefaults
            ? CreateDefaultSettings()
            : NormalizeRequest(request);

        configStoreService.UpsertConfigObject(SettingsConfigName, document =>
        {
            document["CurrentLanguage"] = snapshot.General.CurrentLanguage;
            document["Debug"] = snapshot.General.Debug;
            document["VideoPlayerPath"] = snapshot.Playback.PlayerPath;
            document["UseSystemDefaultFallback"] = snapshot.Playback.UseSystemDefaultFallback;
            document["PosterPriority"] = snapshot.Image.PosterPriority;
            document["CacheSizeLimitMb"] = snapshot.Image.CacheSizeLimitMb;
            document["AutoCleanExpiredCache"] = snapshot.Image.AutoCleanExpiredCache;
            document["ScanDepth"] = snapshot.ScanImport.ScanDepth;
            document["ExcludePatterns"] = snapshot.ScanImport.ExcludePatterns;
            document["OrganizeMode"] = snapshot.ScanImport.OrganizeMode;
            document["DefaultAutoScan"] = snapshot.Library.DefaultAutoScan;
            document["DefaultSortBy"] = snapshot.Library.DefaultSortBy;
            document["DefaultSortOrder"] = snapshot.Library.DefaultSortOrder;
        });

        configStoreService.UpsertConfigObject(MetaTubeConfigName, document =>
        {
            document["ServerUrl"] = snapshot.MetaTube.ServerUrl;
            document["RequestTimeoutSeconds"] = snapshot.MetaTube.RequestTimeoutSeconds;
        });

        var action = request.ResetToDefaults ? "reset" : "updated";
        var occurredAtUtc = DateTimeOffset.UtcNow;
        logger.LogInformation(
            "[Worker-Settings] {Action} settings. language={Language}, timeout={TimeoutSeconds}, playerPath={PlayerPath}, fallback={Fallback}",
            action,
            snapshot.General.CurrentLanguage,
            snapshot.MetaTube.RequestTimeoutSeconds,
            snapshot.Playback.PlayerPath,
            snapshot.Playback.UseSystemDefaultFallback);

        workerEventStreamBroker.Publish(
            "settings.changed",
            "settings",
            new SettingsChangedEvent
            {
                Action = action,
                OccurredAtUtc = occurredAtUtc,
                Settings = snapshot,
            });

        return new UpdateSettingsResponse
        {
            ResetToDefaultsApplied = request.ResetToDefaults,
            Settings = snapshot,
            UpdatedAtUtc = occurredAtUtc,
        };
    }

    public async Task<RunMetaTubeDiagnosticsResponse> RunMetaTubeDiagnosticsAsync(
        RunMetaTubeDiagnosticsRequest request,
        CancellationToken cancellationToken)
    {
        var snapshot = BuildSettingsSnapshot();
        var serverUrl = NormalizeString(request.ServerUrl);
        if (string.IsNullOrWhiteSpace(serverUrl))
        {
            serverUrl = snapshot.MetaTube.ServerUrl;
        }

        var timeoutSeconds = Math.Clamp(
            request.RequestTimeoutSeconds ?? snapshot.MetaTube.RequestTimeoutSeconds,
            MinTimeoutSeconds,
            MaxTimeoutSeconds);
        var testVideoId = NormalizeLanguage(request.TestVideoId, DefaultDiagnosticsVideoId);
        var response = new RunMetaTubeDiagnosticsResponse
        {
            CompletedAtUtc = DateTimeOffset.UtcNow,
            ServerUrl = serverUrl,
            Steps = new List<string>(),
            TestVideoId = testVideoId,
            TimeoutSeconds = timeoutSeconds,
        };

        response.Steps.Add($"目标地址：{(string.IsNullOrWhiteSpace(serverUrl) ? "未配置" : serverUrl)}");
        response.Steps.Add($"请求超时：{timeoutSeconds} 秒");

        if (string.IsNullOrWhiteSpace(serverUrl))
        {
            response.Success = false;
            response.Summary = "MetaTube 服务地址为空，无法执行诊断。";
            response.Steps.Add("请先填写或保存 MetaTube 服务地址。");
            return response;
        }

        try
        {
            var client = new MetaTubeWorkerClient(
                serverUrl,
                timeoutSeconds,
                loggerFactory.CreateLogger<MetaTubeWorkerClient>());

            response.Steps.Add("开始探测根地址。");
            await client.GetServiceDocumentAsync(cancellationToken);
            response.Steps.Add("根地址响应成功。");

            response.Steps.Add("开始读取 providers。");
            var providers = await client.GetProvidersAsync(cancellationToken) ?? new MetaTubeProvidersResponse();
            response.ActorProviderCount = providers.ActorProviders.Count;
            response.MovieProviderCount = providers.MovieProviders.Count;
            response.Steps.Add($"providers 读取成功：movie={response.MovieProviderCount}，actor={response.ActorProviderCount}。");

            response.Steps.Add($"开始搜索测试番号：{testVideoId}。");
            var searchResults = await client.SearchMovieAsync(testVideoId, cancellationToken);
            response.SearchResultCount = searchResults.Count;
            response.Steps.Add($"影片搜索返回 {response.SearchResultCount} 条结果。");

            var firstResult = searchResults.FirstOrDefault();
            if (firstResult is null)
            {
                response.Success = false;
                response.Summary = $"MetaTube 可访问，但测试番号 {testVideoId} 未返回结果。";
                return response;
            }

            response.MatchedMovieId = firstResult.Id;
            response.MatchedProvider = firstResult.Provider;
            response.Steps.Add($"首条命中：provider={firstResult.Provider}，id={firstResult.Id}，number={firstResult.Number}。");

            if (!string.IsNullOrWhiteSpace(firstResult.Provider) && !string.IsNullOrWhiteSpace(firstResult.Id))
            {
                response.Steps.Add("开始读取首条命中的详情。");
                var detail = await client.GetMovieInfoAsync(firstResult.Provider, firstResult.Id, cancellationToken);
                response.DetailTitle = detail?.Title ?? string.Empty;
                response.Steps.Add(string.IsNullOrWhiteSpace(response.DetailTitle)
                    ? "详情接口返回成功，但标题为空。"
                    : $"详情读取成功：{response.DetailTitle}");
            }

            response.Success = true;
            response.Summary = "MetaTube 诊断通过，根地址、providers 和影片搜索链路均可用。";
            return response;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "[Worker-Settings] MetaTube diagnostics failed. serverUrl={ServerUrl}", serverUrl);
            response.Success = false;
            response.Summary = $"MetaTube 诊断失败：{ex.Message}";
            response.Steps.Add($"诊断失败：{ex.Message}");
            return response;
        }
        finally
        {
            response.CompletedAtUtc = DateTimeOffset.UtcNow;
        }
    }

    private GetSettingsResponse BuildSettingsSnapshot()
    {
        var defaults = CreateDefaultSettings();
        var settings = configStoreService.LoadConfigObject(SettingsConfigName);
        var metaTube = configStoreService.LoadConfigObject(MetaTubeConfigName);

        return new GetSettingsResponse
        {
            General = new GeneralSettingsDto
            {
                CurrentLanguage = configStoreService.ReadString(settings, "CurrentLanguage", defaults.General.CurrentLanguage),
                Debug = configStoreService.ReadBoolean(settings, "Debug", defaults.General.Debug),
            },
            Image = new ImageSettingsDto
            {
                PosterPriority = configStoreService.ReadString(settings, "PosterPriority", defaults.Image.PosterPriority),
                CacheSizeLimitMb = (int)configStoreService.ReadInt64(settings, "CacheSizeLimitMb", defaults.Image.CacheSizeLimitMb),
                AutoCleanExpiredCache = configStoreService.ReadBoolean(settings, "AutoCleanExpiredCache", defaults.Image.AutoCleanExpiredCache),
            },
            ScanImport = new ScanImportSettingsDto
            {
                ScanDepth = (int)configStoreService.ReadInt64(settings, "ScanDepth", defaults.ScanImport.ScanDepth),
                ExcludePatterns = configStoreService.ReadString(settings, "ExcludePatterns", defaults.ScanImport.ExcludePatterns),
                OrganizeMode = configStoreService.ReadString(settings, "OrganizeMode", defaults.ScanImport.OrganizeMode),
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = configStoreService.ReadString(settings, "VideoPlayerPath", defaults.Playback.PlayerPath),
                UseSystemDefaultFallback = configStoreService.ReadBoolean(settings, "UseSystemDefaultFallback", defaults.Playback.UseSystemDefaultFallback),
            },
            Library = new LibrarySettingsDto
            {
                DefaultAutoScan = configStoreService.ReadBoolean(settings, "DefaultAutoScan", defaults.Library.DefaultAutoScan),
                DefaultSortBy = configStoreService.ReadString(settings, "DefaultSortBy", defaults.Library.DefaultSortBy),
                DefaultSortOrder = configStoreService.ReadString(settings, "DefaultSortOrder", defaults.Library.DefaultSortOrder),
            },
            MetaTube = new MetaTubeSettingsDto
            {
                RequestTimeoutSeconds = (int)Math.Clamp(
                    configStoreService.ReadInt64(metaTube, "RequestTimeoutSeconds", defaults.MetaTube.RequestTimeoutSeconds),
                    MinTimeoutSeconds,
                    MaxTimeoutSeconds),
                ServerUrl = configStoreService.ReadString(metaTube, "ServerUrl", defaults.MetaTube.ServerUrl),
            },
        };
    }

    private static GetSettingsResponse CreateDefaultSettings()
    {
        return new GetSettingsResponse
        {
            General = new GeneralSettingsDto
            {
                CurrentLanguage = "zh-CN",
                Debug = false,
            },
            Image = new ImageSettingsDto
            {
                PosterPriority = "remote",
                CacheSizeLimitMb = 0,
                AutoCleanExpiredCache = true,
            },
            ScanImport = new ScanImportSettingsDto
            {
                ScanDepth = 0,
                ExcludePatterns = string.Empty,
                OrganizeMode = "none",
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = string.Empty,
                UseSystemDefaultFallback = true,
            },
            Library = new LibrarySettingsDto
            {
                DefaultAutoScan = true,
                DefaultSortBy = "releaseDate",
                DefaultSortOrder = "desc",
            },
            MetaTube = new MetaTubeSettingsDto
            {
                RequestTimeoutSeconds = 60,
                ServerUrl = string.Empty,
            },
        };
    }

    private static GetSettingsResponse NormalizeRequest(UpdateSettingsRequest request)
    {
        var defaults = CreateDefaultSettings();
        var general = request.General ?? throw CreateValidationException("settings.save.general_missing", "General settings payload is required.");
        var image = request.Image ?? defaults.Image;
        var scanImport = request.ScanImport ?? defaults.ScanImport;
        var playback = request.Playback ?? throw CreateValidationException("settings.save.playback_missing", "Playback settings payload is required.");
        var library = request.Library ?? defaults.Library;
        var metaTube = request.MetaTube ?? throw CreateValidationException("settings.save.meta_tube_missing", "MetaTube settings payload is required.");

        return new GetSettingsResponse
        {
            General = new GeneralSettingsDto
            {
                CurrentLanguage = NormalizeLanguage(general.CurrentLanguage, defaults.General.CurrentLanguage),
                Debug = general.Debug,
            },
            Image = new ImageSettingsDto
            {
                PosterPriority = NormalizePosterPriority(image.PosterPriority),
                CacheSizeLimitMb = Math.Max(0, image.CacheSizeLimitMb),
                AutoCleanExpiredCache = image.AutoCleanExpiredCache,
            },
            ScanImport = new ScanImportSettingsDto
            {
                ScanDepth = Math.Max(0, scanImport.ScanDepth),
                ExcludePatterns = NormalizeString(scanImport.ExcludePatterns),
                OrganizeMode = NormalizeOrganizeMode(scanImport.OrganizeMode),
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = NormalizeString(playback.PlayerPath),
                UseSystemDefaultFallback = playback.UseSystemDefaultFallback,
            },
            Library = new LibrarySettingsDto
            {
                DefaultAutoScan = library.DefaultAutoScan,
                DefaultSortBy = NormalizeSortBy(library.DefaultSortBy),
                DefaultSortOrder = NormalizeSortOrder(library.DefaultSortOrder),
            },
            MetaTube = new MetaTubeSettingsDto
            {
                RequestTimeoutSeconds = Math.Clamp(metaTube.RequestTimeoutSeconds, MinTimeoutSeconds, MaxTimeoutSeconds),
                ServerUrl = NormalizeString(metaTube.ServerUrl),
            },
        };
    }

    private static string NormalizeLanguage(string? value, string fallback)
    {
        var normalized = NormalizeString(value);
        return string.IsNullOrWhiteSpace(normalized) ? fallback : normalized;
    }

    private static string NormalizeString(string? value)
    {
        return string.IsNullOrWhiteSpace(value) ? string.Empty : value.Trim();
    }

    private static string NormalizePosterPriority(string? value)
    {
        var normalized = NormalizeString(value);
        return normalized is "remote" or "local" ? normalized : "remote";
    }

    private static string NormalizeOrganizeMode(string? value)
    {
        var normalized = NormalizeString(value);
        return normalized is "none" or "byVid" or "byActor" ? normalized : "none";
    }

    private static string NormalizeSortBy(string? value)
    {
        var normalized = NormalizeString(value);
        return normalized is "releaseDate" or "title" or "lastPlayedAt" or "lastScanAt" ? normalized : "releaseDate";
    }

    private static string NormalizeSortOrder(string? value)
    {
        var normalized = NormalizeString(value);
        return normalized is "asc" or "desc" ? normalized : "desc";
    }

    private static WorkerApiException CreateValidationException(string code, string message)
    {
        return new WorkerApiException(
            StatusCodes.Status422UnprocessableEntity,
            new ApiErrorDto
            {
                Code = code,
                Message = message,
                Retryable = false,
                UserMessage = "设置提交内容不完整，请刷新后重试。",
            });
    }
}
