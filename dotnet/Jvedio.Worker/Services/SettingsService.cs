using System.Text.Json.Nodes;

using Jvedio.Contracts.Common;
using Jvedio.Contracts.Settings;

namespace Jvedio.Worker.Services;

public sealed class SettingsService
{
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
            document["ScanDepth"] = snapshot.ScanImport.ScanDepth;
            document["ExcludePatterns"] = snapshot.ScanImport.ExcludePatterns;
            document["DefaultAutoScan"] = snapshot.Library.DefaultAutoScan;
            document.Remove("PosterPriority");
            document.Remove("CacheSizeLimitMb");
            document.Remove("AutoCleanExpiredCache");
            document.Remove("OrganizeMode");
            document.Remove("DefaultSortBy");
            document.Remove("DefaultSortOrder");
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
        var response = new RunMetaTubeDiagnosticsResponse
        {
            CompletedAtUtc = DateTimeOffset.UtcNow,
            ServerUrl = serverUrl,
            Steps = new List<string>(),
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

            response.Success = true;
            response.Summary = "MetaTube 连通性测试通过，根地址和 providers 均可访问。";
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
            ScanImport = new ScanImportSettingsDto
            {
                ScanDepth = (int)configStoreService.ReadInt64(settings, "ScanDepth", defaults.ScanImport.ScanDepth),
                ExcludePatterns = configStoreService.ReadString(settings, "ExcludePatterns", defaults.ScanImport.ExcludePatterns),
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = configStoreService.ReadString(settings, "VideoPlayerPath", defaults.Playback.PlayerPath),
                UseSystemDefaultFallback = configStoreService.ReadBoolean(settings, "UseSystemDefaultFallback", defaults.Playback.UseSystemDefaultFallback),
            },
            Library = new LibrarySettingsDto
            {
                DefaultAutoScan = configStoreService.ReadBoolean(settings, "DefaultAutoScan", defaults.Library.DefaultAutoScan),
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
            ScanImport = new ScanImportSettingsDto
            {
                ScanDepth = 0,
                ExcludePatterns = string.Empty,
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = string.Empty,
                UseSystemDefaultFallback = true,
            },
            Library = new LibrarySettingsDto
            {
                DefaultAutoScan = true,
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
            ScanImport = new ScanImportSettingsDto
            {
                ScanDepth = Math.Max(0, scanImport.ScanDepth),
                ExcludePatterns = NormalizeString(scanImport.ExcludePatterns),
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = NormalizeString(playback.PlayerPath),
                UseSystemDefaultFallback = playback.UseSystemDefaultFallback,
            },
            Library = new LibrarySettingsDto
            {
                DefaultAutoScan = library.DefaultAutoScan,
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
