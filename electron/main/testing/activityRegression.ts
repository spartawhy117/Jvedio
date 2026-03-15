import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REGRESSION_FLAG = "--regression-activity";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_VIDEO_SIZE_BYTES = 8 * 1024 * 1024;
const SAMPLE_VIDEOS = Array.from({ length: 18 }, (_, index) => `ACT-${String(index + 1).padStart(3, "0")}.mp4`);

export interface ActivityRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface ActivityRegressionEnvironment {
  appBaseDir: string;
  checks: ActivityRegressionCheckResult[];
  sampleLibraryPath: string;
  sourceAppBaseDir: string;
}

export async function prepareActivityRegressionEnvironment(electronRoot: string): Promise<ActivityRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-activity-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "activity-library");

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.mkdir(sampleLibraryPath, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));

  for (const fileName of SAMPLE_VIDEOS) {
    await fsPromises.writeFile(path.join(sampleLibraryPath, fileName), Buffer.alloc(SAMPLE_VIDEO_SIZE_BYTES, 3));
  }

  process.env.JVEDIO_APP_BASE_DIR = runRoot;

  console.log("[Activity-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[Activity-Regression] Sample library path:", sampleLibraryPath);

  return {
    appBaseDir: runRoot,
    checks: [],
    sampleLibraryPath,
    sourceAppBaseDir,
  };
}

export async function runActivityRegression(
  mainWindow: BrowserWindow,
  environment: ActivityRegressionEnvironment,
): Promise<boolean> {
  const libraryName = `Activity Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("[Activity-Regression] Starting focused regression for global activity bar.");

  const createLibrary = await captureCheck("准备 Activity 测试库", async () => {
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
          const titles = Array.from(document.querySelectorAll(".library-title"))
            .map((item) => item.textContent?.trim() ?? "");
          return titles.includes(${JSON.stringify(libraryName)}) && !document.querySelector(".modal-shell");
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "Activity 测试库创建后未出现在 Home 列表。",
    );

    await navigateToLibrary(mainWindow, libraryName);
    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) {
    return false;
  }

  const startScan = await captureCheck("启动扫描并显示全局活动条", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const textarea = document.querySelector('textarea[name="library-scan-paths"]');
          const saveButton = document.querySelector('[data-action="save-library-scan-paths"]');
          if (!(textarea instanceof HTMLTextAreaElement) || !(saveButton instanceof HTMLElement)) {
            throw new Error("未找到扫描目录编辑控件。");
          }

          textarea.value = ${JSON.stringify(environment.sampleLibraryPath)};
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
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
          const bar = document.querySelector('[data-global-activity]');
          const summary = document.querySelector('[data-global-activity-summary]')?.textContent ?? '';
          return Boolean(bar) && summary.includes('library.scan');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "扫描任务启动后未显示全局活动条。",
    );

    return "扫描任务启动后活动条已在库页出现";
  });
  environment.checks.push(startScan);
  logCheckResult(startScan);
  if (!startScan.passed) {
    return false;
  }

  const crossPageVisible = await captureCheck("跨页面可见并可跳回库工作台", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="navigate-home"]');
          if (!(button instanceof HTMLElement)) throw new Error("未找到返回 Home 按钮。");
          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const summary = document.querySelector('[data-global-activity-summary]')?.textContent ?? '';
          const library = document.querySelector('[data-global-activity-library]')?.textContent ?? '';
          return location.hash === '#/home'
            && summary.includes('library.scan')
            && library.includes(${JSON.stringify(libraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "切回 Home 后全局活动条未保留当前任务提示。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-global-activity-open-library]');
          if (!(button instanceof HTMLElement)) throw new Error("未找到活动条库跳转按钮。");
          button.click();
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
      "通过活动条未能返回目标库工作台。",
    );

    return "活动条已在 Home 持续可见，并成功跳回库工作台";
  });
  environment.checks.push(crossPageVisible);
  logCheckResult(crossPageVisible);
  if (!crossPageVisible.passed) {
    return false;
  }

  const closeOut = await captureCheck("任务结束后活动条收口", async () => {
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const cards = Array.from(document.querySelectorAll('.task-card'));
          return cards.some((item) => item.textContent?.includes('library.scan') && item.textContent?.includes('已完成'));
        })()
      `,
      TASK_WAIT_TIMEOUT_MS,
      "扫描任务未在预期时间内完成。",
    );

    await waitForCondition(
      mainWindow,
      `(() => !document.querySelector('[data-global-activity][data-global-activity-state="active"]'))()`,
      TASK_WAIT_TIMEOUT_MS,
      "任务完成后，全局活动条仍保持 active 状态未收口。",
    );

    return "扫描任务完成后活动条已收口";
  });
  environment.checks.push(closeOut);
  logCheckResult(closeOut);
  return closeOut.passed;
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
        const links = Array.from(document.querySelectorAll(".nav-section .nav-link"));
        const target = links.find((item) => item.textContent?.includes(${JSON.stringify(libraryName)}));
        if (!(target instanceof HTMLElement)) throw new Error("未找到目标媒体库导航链接。");
        target.click();
      })()
    `,
  );

  await waitForCondition(
    mainWindow,
    `
      (() => {
        const title = document.querySelector(".content-header h1")?.textContent?.trim() ?? "";
        return location.hash.startsWith("#/libraries/") && title === ${JSON.stringify(libraryName)};
      })()
    `,
    RENDERER_WAIT_TIMEOUT_MS,
    "未成功进入目标媒体库页面。",
  );
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

  throw new Error("Unable to locate the source Jvedio app base directory for activity regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<ActivityRegressionCheckResult> {
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

function logCheckResult(result: ActivityRegressionCheckResult): void {
  if (result.passed) {
    console.log(`[Activity-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[Activity-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
}

async function waitForCondition(
  mainWindow: BrowserWindow,
  expression: string,
  timeoutMs: number,
  timeoutMessage: string,
): Promise<void> {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const satisfied = await executeInRenderer<boolean>(mainWindow, expression);
    if (satisfied) {
      return;
    }

    await delay(250);
  }

  const snapshot = await executeInRenderer<string>(
    mainWindow,
    `
      (() => JSON.stringify({
        hash: location.hash,
        title: document.querySelector(".content-header h1")?.textContent?.trim() ?? "",
        activity: document.querySelector("[data-global-activity-summary]")?.textContent?.trim() ?? "",
        activityState: document.querySelector("[data-global-activity]")?.getAttribute("data-global-activity-state") ?? "",
        tasks: Array.from(document.querySelectorAll(".task-card-title")).map((item) => item.textContent?.trim() ?? "")
      }))()
    `,
  );

  throw new Error(`${timeoutMessage} 快照=${snapshot}`);
}

async function executeInRenderer<TResult>(mainWindow: BrowserWindow, expression: string): Promise<TResult> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<TResult>;
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}
