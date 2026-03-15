import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REGRESSION_FLAG = "--regression-d";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_VID = "JUR-293-C";
const SAMPLE_VIDEO_FILE_NAME = `${SAMPLE_VID}.mp4`;
const SAMPLE_VIDEO_SIZE_BYTES = 16 * 1024 * 1024;
const DEFAULT_METATUBE_SERVER_URL = "https://metatube-server.hf.space";

export interface DRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface DRegressionEnvironment {
  appBaseDir: string;
  checks: DRegressionCheckResult[];
  sampleLibraryPath: string;
  sampleVideoPath: string;
  sourceAppBaseDir: string;
}

export interface DRegressionControls {
  stopWorker(): Promise<void>;
}

export async function prepareDRegressionEnvironment(electronRoot: string): Promise<DRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-d-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "flat-library");
  const sampleVideoPath = path.join(sampleLibraryPath, SAMPLE_VIDEO_FILE_NAME);

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.mkdir(sampleLibraryPath, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));
  await fsPromises.writeFile(sampleVideoPath, Buffer.alloc(SAMPLE_VIDEO_SIZE_BYTES, 7));

  process.env.JVEDIO_APP_BASE_DIR = runRoot;
  if (!process.env.JVEDIO_METATUBE_SERVER_URL) {
    process.env.JVEDIO_METATUBE_SERVER_URL = DEFAULT_METATUBE_SERVER_URL;
  }

  console.log("[D-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[D-Regression] Sample library path:", sampleLibraryPath);

  return {
    appBaseDir: runRoot,
    checks: [],
    sampleLibraryPath,
    sampleVideoPath,
    sourceAppBaseDir,
  };
}

export async function runDRegression(
  mainWindow: BrowserWindow,
  environment: DRegressionEnvironment,
  _controls?: DRegressionControls,
): Promise<boolean> {
  const libraryName = `D Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("[D-Regression] Starting focused regression for Stage D.");

  const createLibrary = await captureCheck("准备阶段 D 测试库", async () => {
    await openCreateLibraryDialog(mainWindow);
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const form = document.querySelector('form[data-form="create-library"]');
          if (!(form instanceof HTMLFormElement)) {
            throw new Error("未找到新建媒体库表单。");
          }

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
      "阶段 D 测试库创建后未出现在 Home 列表。",
    );

    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) {
    return false;
  }

  const saveScanPath = await captureCheck("库默认扫描目录读取与保存", async () => {
    await navigateToLibrary(mainWindow, libraryName);
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const textarea = document.querySelector('textarea[name="library-scan-paths"]');
          const button = document.querySelector('[data-action="save-library-scan-paths"]');
          if (!(textarea instanceof HTMLTextAreaElement) || !(button instanceof HTMLElement)) {
            throw new Error("未找到库扫描目录编辑器。");
          }

          textarea.value = ${JSON.stringify(environment.sampleLibraryPath)};
          textarea.dispatchEvent(new Event("input", { bubbles: true }));
          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const infoBanner = document.querySelector(".info-banner")?.textContent?.trim() ?? "";
          const textarea = document.querySelector('textarea[name="library-scan-paths"]');
          return infoBanner.includes("扫描目录") && textarea instanceof HTMLTextAreaElement
            && textarea.value.includes(${JSON.stringify(environment.sampleLibraryPath)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "保存库默认扫描目录后，页面未显示成功反馈或值未回填。",
    );

    return `已保存扫描目录 ${environment.sampleLibraryPath}`;
  });
  environment.checks.push(saveScanPath);
  logCheckResult(saveScanPath);
  if (!saveScanPath.passed) {
    return false;
  }

  const triggerScan = await captureCheck("触发扫描", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="start-library-scan"]');
          if (!(button instanceof HTMLElement)) {
            throw new Error("未找到触发扫描按钮。");
          }

          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const infoBanner = document.querySelector(".info-banner")?.textContent?.trim() ?? "";
          return infoBanner.includes("扫描任务");
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "触发扫描后未显示任务启动反馈。",
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const tasks = Array.from(document.querySelectorAll(".task-card"));
          return tasks.some((item) => item.textContent?.includes("library.scan"));
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "触发扫描后，任务列表未出现扫描任务。",
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const tasks = Array.from(document.querySelectorAll(".task-card"));
          const finished = tasks.find((item) => item.textContent?.includes("library.scan"));
          const metricValues = Array.from(document.querySelectorAll(".metric-card strong"))
            .map((item) => item.textContent?.trim() ?? "");
          return Boolean(finished?.textContent?.includes("已完成"))
            && metricValues.includes("1");
        })()
      `,
      TASK_WAIT_TIMEOUT_MS,
      "扫描任务未在预期时间内完成，或库影片数未更新为 1。",
    );

    const organizedVideoPath = path.join(environment.sampleLibraryPath, SAMPLE_VID, SAMPLE_VIDEO_FILE_NAME);
    if (!fs.existsSync(organizedVideoPath)) {
      throw new Error(`扫描整理未输出预期目录结构: ${organizedVideoPath}`);
    }

    return `扫描完成并整理到 ${organizedVideoPath}`;
  });
  environment.checks.push(triggerScan);
  logCheckResult(triggerScan);
  if (!triggerScan.passed) {
    return false;
  }

  const taskStatusFeed = await captureCheck("扫描任务状态回传", async () => {
    const snapshot = await executeInRenderer<{
      summaries: string[];
    }>(
      mainWindow,
      `
        (() => ({
          summaries: Array.from(document.querySelectorAll(".task-card-summary"))
            .map((item) => item.textContent?.trim() ?? "")
            .filter((item) => item.length > 0)
        }))()
      `,
    );

    if (!snapshot.summaries.some((item) => item.includes("扫描完成"))) {
      throw new Error(`任务摘要中未找到扫描完成结果: ${JSON.stringify(snapshot.summaries)}`);
    }

    return `任务摘要=${snapshot.summaries.join(" | ")}`;
  });
  environment.checks.push(taskStatusFeed);
  logCheckResult(taskStatusFeed);
  if (!taskStatusFeed.passed) {
    return false;
  }

  const scrapeAndSidecar = await captureCheck("MetaTube 抓取与 sidecar 最小闭环", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="start-library-scrape"]');
          if (!(button instanceof HTMLElement)) {
            throw new Error("未找到触发抓取按钮。");
          }

          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const infoBanner = document.querySelector(".info-banner")?.textContent?.trim() ?? "";
          return infoBanner.includes("抓取任务");
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "触发抓取后未显示任务启动反馈。",
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const tasks = Array.from(document.querySelectorAll(".task-card"));
          const scrapeTask = tasks.find((item) => item.textContent?.includes("library.scrape"));
          return Boolean(scrapeTask?.textContent?.includes("已完成"));
        })()
      `,
      TASK_WAIT_TIMEOUT_MS,
      "抓取任务未在预期时间内完成。",
    );

    const organizedDirectory = path.join(environment.sampleLibraryPath, SAMPLE_VID);
    const expectedOutputs = [
      path.join(organizedDirectory, `${SAMPLE_VID}.nfo`),
      path.join(organizedDirectory, `${SAMPLE_VID}-poster.jpg`),
      path.join(organizedDirectory, `${SAMPLE_VID}-thumb.jpg`),
      path.join(organizedDirectory, `${SAMPLE_VID}-fanart.jpg`),
    ];

    for (const outputPath of expectedOutputs) {
      if (!fs.existsSync(outputPath)) {
        throw new Error(`sidecar 输出缺失: ${outputPath}`);
      }
    }

    return `已输出 ${expectedOutputs.map((item) => path.basename(item)).join(", ")}`;
  });
  environment.checks.push(scrapeAndSidecar);
  logCheckResult(scrapeAndSidecar);
  return scrapeAndSidecar.passed;
}

async function openCreateLibraryDialog(mainWindow: BrowserWindow): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const button = document.querySelector('[data-action="open-create-dialog"]');
        if (!(button instanceof HTMLElement)) {
          throw new Error("未找到新建媒体库按钮。");
        }

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
        if (!(target instanceof HTMLElement)) {
          throw new Error("未找到目标媒体库导航链接。");
        }

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

  throw new Error("Unable to locate the source Jvedio app base directory for Stage D regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<DRegressionCheckResult> {
  try {
    const details = await action();
    return {
      details,
      issue: null,
      name,
      passed: true,
    };
  } catch (error) {
    return {
      details: "执行失败",
      issue: error instanceof Error ? error.message : String(error),
      name,
      passed: false,
    };
  }
}

function logCheckResult(result: DRegressionCheckResult): void {
  if (result.passed) {
    console.log(`[D-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[D-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
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

  throw new Error(timeoutMessage);
}

async function executeInRenderer<TResult>(mainWindow: BrowserWindow, expression: string): Promise<TResult> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<TResult>;
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}
