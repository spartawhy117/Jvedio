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
    private readonly ILogger<SettingsService> logger;
    private readonly WorkerEventStreamBroker workerEventStreamBroker;

    public SettingsService(
        ConfigStoreService configStoreService,
        ILogger<SettingsService> logger,
        WorkerEventStreamBroker workerEventStreamBroker)
    {
        this.configStoreService = configStoreService;
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
            MetaTube = new MetaTubeSettingsDto
            {
                RequestTimeoutSeconds = (int)Math.Clamp(
                    configStoreService.ReadInt64(metaTube, "RequestTimeoutSeconds", defaults.MetaTube.RequestTimeoutSeconds),
                    MinTimeoutSeconds,
                    MaxTimeoutSeconds),
                ServerUrl = configStoreService.ReadString(metaTube, "ServerUrl", defaults.MetaTube.ServerUrl),
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = configStoreService.ReadString(settings, "VideoPlayerPath", defaults.Playback.PlayerPath),
                UseSystemDefaultFallback = configStoreService.ReadBoolean(settings, "UseSystemDefaultFallback", defaults.Playback.UseSystemDefaultFallback),
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
            MetaTube = new MetaTubeSettingsDto
            {
                RequestTimeoutSeconds = 60,
                ServerUrl = string.Empty,
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = string.Empty,
                UseSystemDefaultFallback = true,
            },
        };
    }

    private static GetSettingsResponse NormalizeRequest(UpdateSettingsRequest request)
    {
        var defaults = CreateDefaultSettings();
        var general = request.General ?? throw CreateValidationException("settings.save.general_missing", "General settings payload is required.");
        var metaTube = request.MetaTube ?? throw CreateValidationException("settings.save.meta_tube_missing", "MetaTube settings payload is required.");
        var playback = request.Playback ?? throw CreateValidationException("settings.save.playback_missing", "Playback settings payload is required.");

        return new GetSettingsResponse
        {
            General = new GeneralSettingsDto
            {
                CurrentLanguage = NormalizeLanguage(general.CurrentLanguage, defaults.General.CurrentLanguage),
                Debug = general.Debug,
            },
            MetaTube = new MetaTubeSettingsDto
            {
                RequestTimeoutSeconds = Math.Clamp(metaTube.RequestTimeoutSeconds, MinTimeoutSeconds, MaxTimeoutSeconds),
                ServerUrl = NormalizeString(metaTube.ServerUrl),
            },
            Playback = new PlaybackSettingsDto
            {
                PlayerPath = NormalizeString(playback.PlayerPath),
                UseSystemDefaultFallback = playback.UseSystemDefaultFallback,
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
