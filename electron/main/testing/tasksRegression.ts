import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REGRESSION_FLAG = "--regression-tasks";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_VID = "JUR-293-C";
const SAMPLE_VIDEO_FILE_NAME = `${SAMPLE_VID}.mp4`;
const SAMPLE_VIDEO_SIZE_BYTES = 16 * 1024 * 1024;

export interface TasksRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface TasksRegressionEnvironment {
  appBaseDir: string;
  checks: TasksRegressionCheckResult[];
  sampleLibraryPath: string;
  sourceAppBaseDir: string;
}

export async function prepareTasksRegressionEnvironment(electronRoot: string): Promise<TasksRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-tasks-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "tasks-library");
  const sampleVideoPath = path.join(sampleLibraryPath, SAMPLE_VIDEO_FILE_NAME);

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.mkdir(sampleLibraryPath, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));
  await fsPromises.writeFile(sampleVideoPath, Buffer.alloc(SAMPLE_VIDEO_SIZE_BYTES, 5));

  process.env.JVEDIO_APP_BASE_DIR = runRoot;

  console.log("[Tasks-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[Tasks-Regression] Sample library path:", sampleLibraryPath);

  return {
    appBaseDir: runRoot,
    checks: [],
    sampleLibraryPath,
    sourceAppBaseDir,
  };
}

export async function runTasksRegression(
  mainWindow: BrowserWindow,
  environment: TasksRegressionEnvironment,
): Promise<boolean> {
  const libraryName = `Tasks Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  let failedTaskId = "";

  console.log("[Tasks-Regression] Starting focused regression for task failure details and retry.");

  const createLibrary = await captureCheck("准备任务回归测试库", async () => {
    await waitForCondition(
      mainWindow,
      `(() => Boolean(document.querySelector(".content-header h1")))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "首页未在预期时间内完成渲染。",
    );

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
      "任务回归测试库创建后未出现在 Home 列表。",
    );

    await navigateToLibrary(mainWindow, libraryName);
    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) {
    return false;
  }

  const failureCheck = await captureCheck("失败任务详情入口", async () => {
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
          const failedCard = Array.from(document.querySelectorAll('.task-card[data-task-status="failed"]'))
            .find((item) => item.textContent?.includes('library.scan'));
          const activityState = document.querySelector('[data-global-activity]')?.getAttribute('data-global-activity-state') ?? '';
          return Boolean(failedCard) && activityState === 'failed';
        })()
      `,
      TASK_WAIT_TIMEOUT_MS,
      "扫描失败任务未在预期时间内出现。",
    );

    const failureSnapshot = await executeInRenderer<{
      errorText: string;
      taskId: string;
    }>(
      mainWindow,
      `
        (() => {
          const failedCard = Array.from(document.querySelectorAll('.task-card[data-task-status="failed"]'))
            .find((item) => item.textContent?.includes('library.scan'));
          if (!(failedCard instanceof HTMLElement)) {
            throw new Error("未找到失败的扫描任务卡片。");
          }

          const detailButton = failedCard.querySelector('[data-task-open-detail]');
          if (!(detailButton instanceof HTMLElement)) {
            throw new Error("失败卡片缺少详情入口。");
          }

          const errorText = failedCard.querySelector('[data-task-error]')?.textContent?.trim() ?? '';
          detailButton.click();
          return {
            errorText,
            taskId: failedCard.dataset.taskId ?? '',
          };
        })()
      `,
    );

    failedTaskId = failureSnapshot.taskId;
    if (!failedTaskId) {
      throw new Error("失败任务卡片未返回 taskId。");
    }

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const modal = document.querySelector('[data-task-detail-modal]');
          const errorText = document.querySelector('[data-task-detail-error]')?.textContent?.trim() ?? '';
          return Boolean(modal) && errorText.length > 0 && Boolean(document.querySelector('[data-task-detail-retry]'));
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "失败详情弹窗未成功打开，或缺少重试入口。",
    );

    return `failedTaskId=${failedTaskId}, error=${failureSnapshot.errorText || "modal-only"}`;
  });
  environment.checks.push(failureCheck);
  logCheckResult(failureCheck);
  if (!failureCheck.passed) {
    return false;
  }

  const retryCheck = await captureCheck("从失败详情直接重试", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const textarea = document.querySelector('textarea[name="library-scan-paths"]');
          const saveButton = document.querySelector('[data-action="save-library-scan-paths"]');
          if (!(textarea instanceof HTMLTextAreaElement) || !(saveButton instanceof HTMLElement)) {
            throw new Error("未找到扫描目录编辑器。");
          }

          textarea.value = ${JSON.stringify(environment.sampleLibraryPath)};
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          saveButton.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => (document.querySelector(".info-banner")?.textContent ?? "").includes("扫描目录"))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "修复扫描目录后未显示保存成功反馈。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const retryButton = document.querySelector('[data-task-detail-retry]');
          if (!(retryButton instanceof HTMLElement)) throw new Error("未找到任务详情弹窗重试按钮。");
          retryButton.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => Array.from(document.querySelectorAll('.task-card'))
          .some((item) => item.getAttribute('data-task-retried-from-id') === ${JSON.stringify(failedTaskId)}))()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "重试后未出现新的任务记录。",
    );

    await waitForCondition(
      mainWindow,
      `
        (() => Array.from(document.querySelectorAll('.task-card'))
          .some((item) => item.getAttribute('data-task-retried-from-id') === ${JSON.stringify(failedTaskId)}
            && item.getAttribute('data-task-status') === 'succeeded'))()
      `,
      TASK_WAIT_TIMEOUT_MS,
      "重试扫描任务未在预期时间内完成。",
    );

    const organizedVideoPath = path.join(environment.sampleLibraryPath, SAMPLE_VID, SAMPLE_VIDEO_FILE_NAME);
    if (!fs.existsSync(organizedVideoPath)) {
      throw new Error(`重试成功后未整理出预期影片目录: ${organizedVideoPath}`);
    }

    return `重试成功，整理目录=${organizedVideoPath}`;
  });
  environment.checks.push(retryCheck);
  logCheckResult(retryCheck);
  return retryCheck.passed;
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

  throw new Error("Unable to locate the source Jvedio app base directory for tasks regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<TasksRegressionCheckResult> {
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

function logCheckResult(result: TasksRegressionCheckResult): void {
  if (result.passed) {
    console.log(`[Tasks-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[Tasks-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
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

    await delay(250);
  }

  const snapshot = await executeInRenderer<string>(
    mainWindow,
    `
      (() => JSON.stringify({
        hash: location.hash,
        title: document.querySelector(".content-header h1")?.textContent?.trim() ?? "",
        activityState: document.querySelector("[data-global-activity]")?.getAttribute("data-global-activity-state") ?? "",
        activitySummary: document.querySelector("[data-global-activity-summary]")?.textContent?.trim() ?? "",
        modalOpen: Boolean(document.querySelector("[data-task-detail-modal]")),
        tasks: Array.from(document.querySelectorAll(".task-card")).map((item) => ({
          id: item.getAttribute("data-task-id") ?? "",
          retriedFrom: item.getAttribute("data-task-retried-from-id") ?? "",
          status: item.getAttribute("data-task-status") ?? "",
          text: item.textContent?.trim() ?? "",
        })),
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
