import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REGRESSION_FLAG = "--regression-batch3";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_VIDEO_SIZE_BYTES = 12 * 1024 * 1024;
const SAMPLE_VIDEOS = [
  { fileName: "ABP-123.mp4", vid: "ABP-123" },
  { fileName: "JUR-293-C.mp4", vid: "JUR-293-C" },
] as const;

export interface Batch3RegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface Batch3RegressionEnvironment {
  appBaseDir: string;
  checks: Batch3RegressionCheckResult[];
  fakePlayerLogPath: string;
  fakePlayerPath: string;
  sampleLibraryPath: string;
  sourceAppBaseDir: string;
}

export async function prepareBatch3RegressionEnvironment(electronRoot: string): Promise<Batch3RegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-batch3-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "batch3-library");
  const fakePlayerPath = path.join(runRoot, "fake-player.cmd");
  const fakePlayerLogPath = path.join(runRoot, "fake-player.log");

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.mkdir(sampleLibraryPath, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));

  for (const sample of SAMPLE_VIDEOS) {
    await fsPromises.writeFile(path.join(sampleLibraryPath, sample.fileName), Buffer.alloc(SAMPLE_VIDEO_SIZE_BYTES, 3));
  }

  await fsPromises.writeFile(fakePlayerPath, `@echo off\r\necho %~1>>"${fakePlayerLogPath}"\r\nexit /b 0\r\n`, "utf8");

  process.env.JVEDIO_APP_BASE_DIR = runRoot;
  process.env.JVEDIO_VIDEO_PLAYER_PATH = fakePlayerPath;

  console.log("[Batch3-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[Batch3-Regression] Sample library path:", sampleLibraryPath);
  console.log("[Batch3-Regression] Fake player path:", fakePlayerPath);

  return {
    appBaseDir: runRoot,
    checks: [],
    fakePlayerLogPath,
    fakePlayerPath,
    sampleLibraryPath,
    sourceAppBaseDir,
  };
}

export async function runBatch3Regression(
  mainWindow: BrowserWindow,
  environment: Batch3RegressionEnvironment,
): Promise<boolean> {
  const libraryName = `Batch3 Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("[Batch3-Regression] Starting focused regression for video list and playback.");

  const createLibrary = await captureCheck("准备第三批测试库", async () => {
    await openCreateLibraryDialog(mainWindow);
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const form = document.querySelector('form[data-form="create-library"]');
          if (!(form instanceof HTMLFormElement)) throw new Error("未找到新建媒体库表单。");
          const nameInput = form.querySelector('input[name="name"]');
          const pathInput = form.querySelector('textarea[name="scanPath"]');
          if (!(nameInput instanceof HTMLInputElement) || !(pathInput instanceof HTMLTextAreaElement)) {
            throw new Error("新建媒体库表单字段不完整。");
          }
          nameInput.value = ${JSON.stringify(libraryName)};
          pathInput.value = "";
          form.requestSubmit();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return title === '媒体库总览' && Array.from(document.querySelectorAll('.library-title')).some((item) => item.textContent?.trim() === ${JSON.stringify(libraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "新建媒体库后 Home 未出现测试库。",
    );

    await navigateToLibrary(mainWindow, libraryName);
    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) return false;

  const scanLibrary = await captureCheck("扫描 2 个样例影片", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const textarea = document.querySelector('textarea[name="library-scan-paths"]');
          const saveButton = document.querySelector('[data-action="save-library-scan-paths"]');
          const scanButton = document.querySelector('[data-action="start-library-scan"]');
          if (!(textarea instanceof HTMLTextAreaElement) || !(saveButton instanceof HTMLElement) || !(scanButton instanceof HTMLElement)) {
            throw new Error("库工作台操作控件不完整。");
          }
          textarea.value = ${JSON.stringify(environment.sampleLibraryPath)};
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
          saveButton.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('扫描目录'))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "保存扫描目录后未显示成功反馈。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="start-library-scan"]');
          if (!(button instanceof HTMLElement)) throw new Error("未找到触发扫描按钮。");
          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const taskCards = Array.from(document.querySelectorAll('.task-card'));
          return taskCards.some((item) => item.textContent?.includes('library.scan') && item.textContent?.includes('已完成'));
        })()
      `,
      TASK_WAIT_TIMEOUT_MS,
      "扫描任务未在预期时间内完成。",
    );

    await waitForCondition(
      mainWindow,
      `(() => document.querySelectorAll('.video-result-card').length === 2)()`,
      TASK_WAIT_TIMEOUT_MS,
      "扫描完成后库页未展示 2 个影片结果。",
    );

    return "已完成扫描并展示 2 个影片结果";
  });
  environment.checks.push(scanLibrary);
  logCheckResult(scanLibrary);
  if (!scanLibrary.passed) return false;

  const filterSortRefresh = await captureCheck("基础筛选、排序、刷新", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const keyword = document.querySelector('[data-query-field="keyword"]');
          const apply = document.querySelector('[data-action="apply-library-video-query"]');
          if (!(keyword instanceof HTMLInputElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到影片筛选控件。");
          }
          keyword.value = 'ABP';
          keyword.dispatchEvent(new Event('input', { bubbles: true }));
          apply.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const cards = Array.from(document.querySelectorAll('.video-result-card'));
          return cards.length === 1 && cards[0]?.textContent?.includes('ABP-123');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "关键字筛选后未只保留 ABP-123。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const reset = document.querySelector('[data-action="reset-library-video-query"]');
          const sortBy = document.querySelector('[data-query-field="sortBy"]');
          const order = document.querySelector('[data-query-field="sortOrder"]');
          const apply = document.querySelector('[data-action="apply-library-video-query"]');
          if (!(reset instanceof HTMLElement) || !(sortBy instanceof HTMLSelectElement) || !(order instanceof HTMLSelectElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到重置或排序控件。");
          }
          reset.click();
          sortBy.value = 'vid';
          sortBy.dispatchEvent(new Event('change', { bubbles: true }));
          order.value = 'asc';
          order.dispatchEvent(new Event('change', { bubbles: true }));
          apply.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const codes = Array.from(document.querySelectorAll('.video-result-card .code-pill')).map((item) => item.textContent?.trim() ?? '');
          return codes.length === 2 && codes[0] === 'ABP-123' && codes[1] === 'JUR-293-C';
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "按 VID 升序排序后结果顺序不符合预期。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const refresh = document.querySelector('[data-action="refresh-library-videos"]');
          if (!(refresh instanceof HTMLElement)) throw new Error("未找到刷新结果按钮。");
          refresh.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('影片结果集'))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "刷新结果后未显示成功反馈。",
    );

    return "已验证关键字筛选、VID 升序排序和结果刷新";
  });
  environment.checks.push(filterSortRefresh);
  logCheckResult(filterSortRefresh);
  if (!filterSortRefresh.passed) return false;

  const detailRoute = await captureCheck("视频详情路由壳", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const target = Array.from(document.querySelectorAll('.video-result-card a')).find((item) => item.textContent?.includes('ABP-123'));
          if (!(target instanceof HTMLElement)) throw new Error("未找到 ABP-123 详情入口。");
          target.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return location.hash.startsWith('#/videos/') && title.includes('ABP-123') && Boolean(document.querySelector('[data-action="play-video"]'));
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "未成功进入视频详情页。",
    );

    return `当前路由=${await executeInRenderer<string>(mainWindow, '(() => location.hash)()')}`;
  });
  environment.checks.push(detailRoute);
  logCheckResult(detailRoute);
  if (!detailRoute.passed) return false;

  const playCall = await captureCheck("打通播放调用", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="play-video"]');
          if (!(button instanceof HTMLElement)) throw new Error("未找到播放按钮。");
          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('播放器'))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "触发播放后未显示调用播放器反馈。",
    );

    await waitForFile(environment.fakePlayerLogPath, RENDERER_WAIT_TIMEOUT_MS, "假播放器未收到播放调用。");
    const logText = await fsPromises.readFile(environment.fakePlayerLogPath, 'utf8');
    if (!logText.includes('ABP-123.mp4')) {
      throw new Error(`假播放器日志未记录 ABP-123.mp4: ${logText}`);
    }

    return `假播放器日志=${logText.trim()}`;
  });
  environment.checks.push(playCall);
  logCheckResult(playCall);
  if (!playCall.passed) return false;

  const playbackWriteback = await captureCheck("播放写回", async () => {
    const hash = await executeInRenderer<string>(mainWindow, `(() => location.hash || "")()`);
    const trimmedHash = hash.replace(/^#/, "");
    const [routePath] = trimmedHash.split("?");
    const videoId = routePath.replace(/^\/videos\//, "").trim();
    if (!videoId) {
      throw new Error(`当前详情路由缺少 videoId: ${hash}`);
    }

    const workerBaseUrl = await getWorkerBaseUrl(mainWindow);
    const response = await fetch(`${workerBaseUrl}/api/videos/${encodeURIComponent(videoId)}`);
    if (!response.ok) {
      throw new Error(`查询视频详情失败，状态码=${response.status}`);
    }

    const payload = await response.json() as {
      data: {
        video: {
          lastPlayedAt: string | null;
        } | null;
      } | null;
    };
    const lastPlayedAt = payload.data?.video?.lastPlayedAt ?? "";
    if (!lastPlayedAt) {
      throw new Error("播放后视频详情仍未回填 lastPlayedAt。");
    }

    return `lastPlayedAt=${lastPlayedAt}`;
  });
  environment.checks.push(playbackWriteback);
  logCheckResult(playbackWriteback);
  return playbackWriteback.passed;
}

async function openCreateLibraryDialog(mainWindow: BrowserWindow): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const button = document.querySelector('[data-action="open-create-dialog"]');
        if (!(button instanceof HTMLElement)) throw new Error("未找到新建媒体库按钮。");
        button.click();
      })()
    `,
  );

  await waitForCondition(
    mainWindow,
    `(() => Boolean(document.querySelector('form[data-form="create-library"]')))()`,
    RENDERER_WAIT_TIMEOUT_MS,
    "新建媒体库对话框未成功打开。",
  );
}

async function navigateToLibrary(mainWindow: BrowserWindow, libraryName: string): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const target = Array.from(document.querySelectorAll('.nav-section .nav-link')).find((item) => item.textContent?.includes(${JSON.stringify(libraryName)}));
        if (!(target instanceof HTMLElement)) throw new Error("未找到目标媒体库导航链接。");
        target.click();
      })()
    `,
  );

  await waitForCondition(
    mainWindow,
    `
      (() => {
        const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
        return location.hash.startsWith('#/libraries/') && title === ${JSON.stringify(libraryName)};
      })()
    `,
    RENDERER_WAIT_TIMEOUT_MS,
    "未成功进入目标媒体库页面。",
  );
}

async function getWorkerBaseUrl(mainWindow: BrowserWindow): Promise<string> {
  return executeInRenderer<string>(mainWindow, `(() => window.jvedioWorker.getWorkerBaseUrl())()`);
}

function resolveReleaseAppBaseDir(electronRoot: string): string {
  const candidates = [
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio", "bin", "Release"),
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio", "bin", "Debug"),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(path.join(candidate, "Jvedio.exe"))) {
      return candidate;
    }
  }

  throw new Error("Unable to locate the source Jvedio app base directory for Batch 3 regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<Batch3RegressionCheckResult> {
  try {
    const details = await action();
    return { details, issue: null, name, passed: true };
  } catch (error) {
    return {
      details: "执行失败",
      issue: error instanceof Error ? error.message : String(error),
      name,
      passed: false,
    };
  }
}

function logCheckResult(result: Batch3RegressionCheckResult): void {
  if (result.passed) {
    console.log(`[Batch3-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[Batch3-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
}

async function waitForFile(filePath: string, timeoutMs: number, timeoutMessage: string): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    if (fs.existsSync(filePath)) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 200));
  }

  throw new Error(timeoutMessage);
}

async function waitForCondition(
  mainWindow: BrowserWindow,
  expression: string,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() <= deadline) {
    const matched = await executeInRenderer<boolean>(mainWindow, expression);
    if (matched) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  const snapshot = await executeInRenderer<string>(
    mainWindow,
    `
      (async () => {
        const workerBaseUrl = await window.jvedioWorker.getWorkerBaseUrl();
        const libraryId = location.hash.replace(/^#\\/libraries\\//, '').split('?')[0]?.trim() ?? '';
        let directVideoCount = -1;
        let directVideoError = '';
        let directVideoStatus = -1;
        let directVideoBody = '';
        if (libraryId) {
          try {
            const response = await fetch(workerBaseUrl + '/api/libraries/' + encodeURIComponent(libraryId) + '/videos?sortBy=lastScanDate&sortOrder=desc&pageIndex=0&pageSize=60');
            directVideoStatus = response.status;
            directVideoBody = await response.text();
            const payload = directVideoBody ? JSON.parse(directVideoBody) : null;
            directVideoCount = payload?.data?.items?.length ?? -1;
          } catch (error) {
            directVideoError = error instanceof Error ? error.message : String(error);
          }
        }

        return JSON.stringify({
          hash: location.hash,
          title: document.querySelector('.content-header h1')?.textContent?.trim() ?? '',
          infoBanner: document.querySelector('.info-banner')?.textContent?.trim() ?? '',
          inlineError: document.querySelector('.inline-error')?.textContent?.trim() ?? '',
          workerWarning: document.querySelector('.warning-banner')?.textContent?.trim() ?? '',
          videoCardCount: document.querySelectorAll('.video-result-card').length,
          taskCards: Array.from(document.querySelectorAll('.task-card')).map((item) => item.textContent?.trim() ?? ''),
          emptyCard: document.querySelector('.video-results-surface .empty-card')?.textContent?.trim() ?? '',
          workerBaseUrl,
          directVideoCount,
          directVideoError,
          directVideoStatus,
          directVideoBody,
        });
      })()
    `,
  );
  throw new Error(`${timeoutMessage} 快照=${snapshot}`);
}

async function executeInRenderer<TResult>(mainWindow: BrowserWindow, expression: string): Promise<TResult> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<TResult>;
}
