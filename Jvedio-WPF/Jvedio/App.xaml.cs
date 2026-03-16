using Jvedio.Core.Global;
using Jvedio.Core.Tasks;
using SuperControls.Style.Windows;
using SuperUtils.IO;
using System;
using System.Threading;
using System.Windows;
using SuperControls.Style;
using System.Text;
using System.Windows.Interop;
using SuperUtils.Systems;
using Jvedio.Windows;
using System.IO;
#if DEBUG
#else
using System.Diagnostics;
using System.Windows.Threading;
using System.Threading.Tasks;
using System.Runtime.InteropServices;
#endif

namespace Jvedio
{
    /// <summary>
    /// App.xaml 的交互逻辑
    /// </summary>
    public partial class App : Application
    {
        public static Jvedio.Core.Logs.Logger Logger { get; private set; }
        public static ScreenShotManager ScreenShotManager { get; private set; }
        public static ScanManager ScanManager { get; private set; }
        public static DownloadManager DownloadManager { get; private set; }


        public EventWaitHandle ProgramStarted { get; set; }

        static App()
        {
            Init();
        }

        public static void Init()
        {

            Logger = Jvedio.Core.Logs.Logger.Instance;
            Jvedio.Core.Logs.Logger.ResetCurrentLog();


            ScreenShotManager = ScreenShotManager.CreateInstance();
            ScanManager = ScanManager.CreateInstance();
            DownloadManager = DownloadManager.CreateInstance();


            Window_ErrorMsg.OnFeedBack += () => {
                FileHelper.TryOpenUrl(UrlManager.FeedBackUrl);
            };
            Window_ErrorMsg.OnLog += (str) => {
                Logger.Info(str);
            };

        }

        protected override void OnStartup(StartupEventArgs e)
        {
            SuperUtils.Handler.LogHandler.Logger = Logger;
            SuperControls.Style.Handler.LogHandler.Logger = Logger;

            Logger.Info(Environment.NewLine);
            Logger.Info("     ██╗██╗   ██╗███████╗██████╗ ██╗ ██████╗ ");
            Logger.Info("     ██║██║   ██║██╔════╝██╔══██╗██║██╔═══██╗");
            Logger.Info("     ██║██║   ██║█████╗  ██║  ██║██║██║   ██║");
            Logger.Info("██   ██║╚██╗ ██╔╝██╔══╝  ██║  ██║██║██║   ██║");
            Logger.Info("╚█████╔╝ ╚████╔╝ ███████╗██████╔╝██║╚██████╔╝");
            Logger.Info(" ╚════╝   ╚═══╝  ╚══════╝╚═════╝ ╚═╝ ╚═════╝ ");
            Logger.Info(Environment.NewLine);

            Logger.Info($"app init, version: {App.GetLocalVersion(false)}");
            Logger.Info($"release date: {ConfigManager.RELEASE_DATE}");

#if DEBUG
#else
            if (ElectronShellLauncher.TryLaunch(Logger)) {
                Shutdown();
                return;
            }

            bool createNew;
            ProgramStarted = new EventWaitHandle(false, EventResetMode.AutoReset, "Jvedio", out createNew);
            if (!createNew) {
                //new MsgBox($"Jvedio {LangManager.GetValueByKey("Running")}").ShowDialog();
                //App.Current.Shutdown();
                //Environment.Exit(0);

                var current = Process.GetCurrentProcess();
                Process[] processes = Process.GetProcessesByName(current.ProcessName);
                //new MsgBox($"找到数目：{processes.Length}, ProcessName： {current.ProcessName}, id: {current.Id}").ShowDialog();

                Process runningProcess = null;
                for (int i = 0; i < processes.Length; i++) {
                    if (processes[i].Id != current.Id) {
                        runningProcess = processes[i];
                        break;
                    }
                }
                if (runningProcess != null) {
                    //new MsgBox($"找到运行中的任务：{runningProcess.Id}").ShowDialog();
                    IntPtr hWnd = IntPtr.Zero;
                    hWnd = runningProcess.MainWindowHandle;

                    // todo 最小化到任务栏后，无法打开窗体
                    Logger.Info($"send to {runningProcess.Id} with data: {Win32Helper.WIN_CUSTOM_MSG_OPEN_WINDOW}");
                    Win32Helper.SendArgs(hWnd, Win32Helper.WIN_CUSTOM_MSG_OPEN_WINDOW);
                }
                Shutdown();
            }

            // UI线程未捕获异常处理事件
            this.DispatcherUnhandledException += new DispatcherUnhandledExceptionEventHandler(Window_ErrorMsg.App_DispatcherUnhandledException);

            // Task线程内未捕获异常处理事件
            TaskScheduler.UnobservedTaskException += Window_ErrorMsg.TaskScheduler_UnobservedTaskException;

            // 非UI线程未捕获异常处理事件
            AppDomain.CurrentDomain.UnhandledException += new UnhandledExceptionEventHandler(Window_ErrorMsg.CurrentDomain_UnhandledException);

#endif
            base.OnStartup(e);
        }



        protected override void OnExit(ExitEventArgs e)
        {
            ConfigManager.SaveAll();

            Logger.Info(Environment.NewLine);
            Logger.Info("==== goodbye ====");
            Logger.Info(Environment.NewLine);

            base.OnExit(e);
        }


        public static void ShowAbout()
        {
            Dialog_About about = new Dialog_About();
            about.AppName = "Jvedio";
            about.AppSubName = "本地视频管理软件";
            about.Version = GetLocalVersion();
            about.ReleaseDate = ConfigManager.RELEASE_DATE;
            about.Author = "Chao";
            about.License = "GPL-3.0";
            about.GithubUrl = UrlManager.ProjectUrl;
            about.WebUrl = UrlManager.WebPage;
            about.JoinGroupUrl = UrlManager.ProjectUrl;
            about.Image =
                SuperUtils.Media.ImageHelper.ImageFromUri("pack://application:,,,/Resources/Picture/Jvedio.png");
            about.ShowDialog();
        }


        public static string GetLocalVersion(bool format = true)
        {
            string local = System.Reflection.Assembly.GetExecutingAssembly().GetName().Version.ToString();
            if (format && local.EndsWith(".0.0"))
                local = local.Substring(0, local.Length - ".0.0".Length);
            return local;
        }

    }
}

#if DEBUG
#else
internal static class ElectronShellLauncher
{
    private const string DisableLegacyFallbackEnvironmentVariable = "JVEDIO_FORCE_LEGACY_WPF";
    private const string ElectronShellDirectoryName = "electron-shell";

    public static bool TryLaunch(Jvedio.Core.Logs.Logger logger)
    {
        if (ShouldUseLegacyWpf()) {
            logger.Info("[Electron-Launcher] Legacy WPF startup forced by environment variable.");
            return false;
        }

        string appBaseDirectory = AppDomain.CurrentDomain.BaseDirectory;
        string electronRoot = Path.Combine(appBaseDirectory, ElectronShellDirectoryName);
        string electronExecutablePath = Path.Combine(electronRoot, "electron-runtime", "electron.exe");
        string packageJsonPath = Path.Combine(electronRoot, "package.json");
        string bootstrapPath = Path.Combine(electronRoot, "dist", "main", "app", "bootstrap.js");

        if (!File.Exists(electronExecutablePath) || !File.Exists(packageJsonPath) || !File.Exists(bootstrapPath)) {
            logger.Warn($"[Electron-Launcher] Electron shell artifacts were not found under {electronRoot}. Falling back to legacy WPF.");
            return false;
        }

        string workerDllPath = Path.Combine(appBaseDirectory, "worker", "Jvedio.Worker.dll");

        try {
            ProcessStartInfo startInfo = new ProcessStartInfo {
                FileName = electronExecutablePath,
                Arguments = ".",
                WorkingDirectory = electronRoot,
                UseShellExecute = false
            };

            startInfo.EnvironmentVariables["JVEDIO_APP_BASE_DIR"] = appBaseDirectory.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar);
            if (File.Exists(workerDllPath)) {
                startInfo.EnvironmentVariables["JVEDIO_WORKER_DLL"] = workerDllPath;
                startInfo.EnvironmentVariables["JVEDIO_WORKER_CWD"] = Path.GetDirectoryName(workerDllPath);
            }

            Process process = Process.Start(startInfo);
            if (process == null) {
                logger.Warn("[Electron-Launcher] Process.Start returned null. Falling back to legacy WPF.");
                return false;
            }

            logger.Info($"[Electron-Launcher] Started Electron shell. pid={process.Id}, shellRoot={electronRoot}");
            return true;
        } catch (Exception ex) {
            logger.Error(ex);
            logger.Warn("[Electron-Launcher] Failed to start Electron shell. Falling back to legacy WPF.");
            return false;
        }
    }

    private static bool ShouldUseLegacyWpf()
    {
        string value = Environment.GetEnvironmentVariable(DisableLegacyFallbackEnvironmentVariable);
        return string.Equals(value, "1", StringComparison.OrdinalIgnoreCase)
            || string.Equals(value, "true", StringComparison.OrdinalIgnoreCase);
    }
}
#endif
