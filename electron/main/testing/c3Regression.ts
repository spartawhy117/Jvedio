import { BrowserWindow } from "electron";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

const REGRESSION_FLAG = "--regression-c3";
const RENDERER_WAIT_TIMEOUT_MS = 15000;

export interface C3RegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface C3RegressionEnvironment {
  appBaseDir: string;
  checks: C3RegressionCheckResult[];
  sourceAppBaseDir: string;
}

export interface C3RegressionControls {
  stopWorker(): Promise<void>;
}

interface RendererSnapshot {
  hash: string;
  infoBanner: string | null;
  inlineError: string | null;
  libraryCards: string[];
  navItems: string[];
  taskSummaryLastUpdatedUtc: string | null;
  title: string;
  workerWarning: string | null;
}

export async function prepareC3RegressionEnvironment(electronRoot: string): Promise<C3RegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fs.mkdtemp(path.join(os.tmpdir(), "jvedio-c3-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);

  await fs.mkdir(targetUserDataDir, { recursive: true });
  await fs.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fs.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fs.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));

  process.env.JVEDIO_APP_BASE_DIR = runRoot;

  console.log("[C3-Regression] Prepared isolated app base directory:", runRoot);

  return {
    appBaseDir: runRoot,
    checks: [],
    sourceAppBaseDir,
  };
}

export async function runC3Regression(
  mainWindow: BrowserWindow,
  environment: C3RegressionEnvironment,
  controls?: C3RegressionControls,
): Promise<boolean> {
  const createdLibraryName = `C3 Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const createdScanPath = `D:\\Jvedio-C3-Regression\\${createdLibraryName.replace(/\s+/g, "-")}`;
  const sseLibraryName = `C4 Event Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const sseScanPath = `D:\\Jvedio-C4-Regression\\${sseLibraryName.replace(/\s+/g, "-")}`;

  console.log("[C3-Regression] Starting focused regression for Home MVP.");

  const homeLoad = await captureCheck("Home 首屏加载", async () => {
    try {
      await waitForCondition(
        mainWindow,
        `
          (() => {
            const title = document.querySelector(".content-header h1")?.textContent?.trim() ?? "";
            const loadingVisible = Boolean(document.querySelector(".loading-shell"));
            return !loadingVisible && title === "媒体库总览";
          })()
        `,
        RENDERER_WAIT_TIMEOUT_MS,
        "Home 页面未在预期时间内完成加载。",
      );
    } catch (error) {
      const snapshot = await getRendererSnapshot(mainWindow);
      const excerpt = await executeInRenderer<string>(
        mainWindow,
        `(() => document.body?.innerText?.slice(0, 500) ?? "")()`,
      );
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`${reason} 当前快照=${JSON.stringify(snapshot)} 文本摘录=${excerpt}`);
    }

    const snapshot = await getRendererSnapshot(mainWindow);
    if (snapshot.inlineError) {
      throw new Error(`页面出现错误横幅: ${snapshot.inlineError}`);
    }
    if (snapshot.workerWarning) {
      throw new Error(`页面出现 Worker 警告: ${snapshot.workerWarning}`);
    }

    return `标题=${snapshot.title}; 当前路由=${snapshot.hash || "#/home"}; 侧栏库数量=${snapshot.navItems.length}`;
  });
  environment.checks.push(homeLoad);
  logCheckResult(homeLoad);
  if (!homeLoad.passed) {
    return false;
  }

  const createLibrary = await captureCheck("新建库", async () => {
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

          nameInput.value = ${JSON.stringify(createdLibraryName)};
          pathInput.value = ${JSON.stringify(createdScanPath)};
          form.requestSubmit();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const infoBanner = document.querySelector(".info-banner")?.textContent?.trim() ?? "";
          const libraryTitles = Array.from(document.querySelectorAll(".library-title"))
            .map((item) => item.textContent?.trim() ?? "");
          return infoBanner.includes(${JSON.stringify(createdLibraryName)})
            && libraryTitles.includes(${JSON.stringify(createdLibraryName)})
            && !document.querySelector(".modal-shell");
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "新建媒体库后，Home 列表未在预期时间内刷新。",
    );

    const snapshot = await getRendererSnapshot(mainWindow);
    return `已创建 ${createdLibraryName}，Home 卡片数量=${snapshot.libraryCards.length}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) {
    return false;
  }

  const navigationSync = await captureCheck("左侧导航同步", async () => {
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const navItems = Array.from(document.querySelectorAll(".nav-section .nav-link span"))
            .map((item) => item.textContent?.trim() ?? "");
          return navItems.includes(${JSON.stringify(createdLibraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "新建媒体库后，左侧导航未出现新库。",
    );

    const snapshot = await getRendererSnapshot(mainWindow);
    return `新库已出现在左侧导航，当前导航库数量=${snapshot.navItems.length}`;
  });
  environment.checks.push(navigationSync);
  logCheckResult(navigationSync);
  if (!navigationSync.passed) {
    return false;
  }

  const routeJump = await captureCheck("库路由跳转", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const links = Array.from(document.querySelectorAll(".nav-section .nav-link"));
          const target = links.find((item) => item.textContent?.includes(${JSON.stringify(createdLibraryName)}));
          if (!(target instanceof HTMLElement)) {
            throw new Error("未找到新建库的导航链接。");
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
          return location.hash.startsWith("#/libraries/") && title === ${JSON.stringify(createdLibraryName)};
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "库路由跳转后未进入对应 Library 壳页面。",
    );

    const snapshot = await getRendererSnapshot(mainWindow);
    return `当前路由=${snapshot.hash}; 标题=${snapshot.title}`;
  });
  environment.checks.push(routeJump);
  logCheckResult(routeJump);
  if (!routeJump.passed) {
    return false;
  }

  const deleteLibrary = await captureCheck("删除库", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="open-delete-dialog"]');
          if (!(button instanceof HTMLElement)) {
            throw new Error("未找到删除媒体库按钮。");
          }

          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => Boolean(document.querySelector('[data-action="confirm-delete-library"]')))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "删除媒体库对话框未成功打开。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="confirm-delete-library"]');
          if (!(button instanceof HTMLElement)) {
            throw new Error("未找到确认删除按钮。");
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
          const navItems = Array.from(document.querySelectorAll(".nav-section .nav-link span"))
            .map((item) => item.textContent?.trim() ?? "");
          const title = document.querySelector(".content-header h1")?.textContent?.trim() ?? "";
          return location.hash === "#/home"
            && title === "媒体库总览"
            && infoBanner.includes("已删除")
            && !navItems.includes(${JSON.stringify(createdLibraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "删除媒体库后未正确回退到 Home 或导航未同步移除。",
    );

    const snapshot = await getRendererSnapshot(mainWindow);
    return `已删除 ${createdLibraryName}，删除后路由=${snapshot.hash}; 导航库数量=${snapshot.navItems.length}`;
  });
  environment.checks.push(deleteLibrary);
  logCheckResult(deleteLibrary);
  if (!deleteLibrary.passed) {
    return false;
  }

  const sseLibraryChanged = await captureCheck("library.changed 事件驱动同步", async () => {
    const workerBaseUrl = await getWorkerBaseUrl(mainWindow);
    const initialSnapshot = await getRendererSnapshot(mainWindow);

    const createResponse = await fetch(`${workerBaseUrl}/api/libraries`, {
      body: JSON.stringify({
        name: sseLibraryName,
        path: sseScanPath,
        scanPaths: [sseScanPath],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!createResponse.ok) {
      throw new Error(`外部 API 创建媒体库失败，状态码=${createResponse.status}`);
    }

    const createPayload = await createResponse.json() as {
      data: {
        library: {
          libraryId: string;
        };
      } | null;
    };
    const createdLibraryId = createPayload.data?.library.libraryId ?? "";
    if (!createdLibraryId) {
      throw new Error("外部 API 创建媒体库成功，但未返回 libraryId。");
    }

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const titles = Array.from(document.querySelectorAll(".library-title"))
            .map((item) => item.textContent?.trim() ?? "");
          const navItems = Array.from(document.querySelectorAll(".nav-section .nav-link span"))
            .map((item) => item.textContent?.trim() ?? "");
          return titles.includes(${JSON.stringify(sseLibraryName)})
            && navItems.includes(${JSON.stringify(sseLibraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "外部 API 创建媒体库后，UI 未通过 library.changed 自动同步。",
    );

    const updatedSnapshot = await getRendererSnapshot(mainWindow);
    if (updatedSnapshot.workerWarning) {
      throw new Error(`事件同步期间出现 Worker 警告: ${updatedSnapshot.workerWarning}`);
    }

    await fetch(`${workerBaseUrl}/api/libraries/${encodeURIComponent(createdLibraryId)}`, {
      method: "DELETE",
    });

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const titles = Array.from(document.querySelectorAll(".library-title"))
            .map((item) => item.textContent?.trim() ?? "");
          const navItems = Array.from(document.querySelectorAll(".nav-section .nav-link span"))
            .map((item) => item.textContent?.trim() ?? "");
          return !titles.includes(${JSON.stringify(sseLibraryName)})
            && !navItems.includes(${JSON.stringify(sseLibraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "外部 API 删除媒体库后，UI 未通过 library.changed 自动移除。",
    );

    return `事件前库数=${initialSnapshot.navItems.length}; 事件后已完成自动新增与移除`;
  });
  environment.checks.push(sseLibraryChanged);
  logCheckResult(sseLibraryChanged);
  if (!sseLibraryChanged.passed) {
    return false;
  }

  const taskSummaryRefresh = await captureCheck("任务摘要刷新", async () => {
    const workerBaseUrl = await getWorkerBaseUrl(mainWindow);
    const beforeSnapshot = await getRendererSnapshot(mainWindow);
    const beforeLastUpdatedUtc = beforeSnapshot.taskSummaryLastUpdatedUtc;

    const response = await fetch(`${workerBaseUrl}/api/libraries`, {
      body: JSON.stringify({
        name: `${sseLibraryName}-Task`,
        path: `${sseScanPath}-Task`,
        scanPaths: [`${sseScanPath}-Task`],
      }),
      headers: {
        "Content-Type": "application/json",
      },
      method: "POST",
    });
    if (!response.ok) {
      throw new Error(`触发任务摘要刷新时创建媒体库失败，状态码=${response.status}`);
    }

    const payload = await response.json() as {
      data: {
        library: {
          libraryId: string;
        };
      } | null;
    };
    const libraryId = payload.data?.library.libraryId ?? "";
    if (!libraryId) {
      throw new Error("任务摘要刷新检查未获取到新建库的 libraryId。");
    }

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const lastUpdated = document.querySelector(".worker-note")?.getAttribute("data-last-updated-utc");
          return Boolean(lastUpdated) && lastUpdated !== ${JSON.stringify(beforeLastUpdatedUtc)};
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "task.summary.changed 触发后，任务摘要刷新时间未更新。",
    );

    await fetch(`${workerBaseUrl}/api/libraries/${encodeURIComponent(libraryId)}`, {
      method: "DELETE",
    });

    const afterSnapshot = await getRendererSnapshot(mainWindow);
    return `任务摘要刷新时间由 ${beforeLastUpdatedUtc ?? "null"} 更新为 ${afterSnapshot.taskSummaryLastUpdatedUtc ?? "null"}`;
  });
  environment.checks.push(taskSummaryRefresh);
  logCheckResult(taskSummaryRefresh);
  if (!taskSummaryRefresh.passed) {
    return false;
  }

  const workerFailureFeedback = await captureCheck("Worker 未就绪错误反馈", async () => {
    if (!controls) {
      throw new Error("当前回归环境未注入 Worker 控制器，无法验证停机错误反馈。");
    }

    await controls.stopWorker();
    await delay(400);

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="refresh-home"]');
          if (!(button instanceof HTMLElement)) {
            throw new Error("未找到刷新按钮。");
          }

          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const errorBanner = document.querySelector(".error-banner")?.textContent?.trim() ?? "";
          const warningBanner = document.querySelector(".warning-banner")?.textContent?.trim() ?? "";
          return errorBanner.includes("Worker") || errorBanner.includes("本地") || warningBanner.includes("Worker");
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "停掉 Worker 后，页面未显示明确错误反馈。",
    );

    const snapshot = await getRendererSnapshot(mainWindow);
    return `错误横幅=${snapshot.inlineError ?? "null"}; 警告横幅=${snapshot.workerWarning ?? "null"}`;
  });
  environment.checks.push(workerFailureFeedback);
  logCheckResult(workerFailureFeedback);
  return workerFailureFeedback.passed;
}

function resolveReleaseAppBaseDir(electronRoot: string): string {
  const candidates = [
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio", "bin", "Release"),
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio", "bin", "Debug")
  ];

  for (const candidate of candidates) {
    const executablePath = path.join(candidate, "Jvedio.exe");
    if (require("node:fs").existsSync(executablePath)) {
      return candidate;
    }
  }

  throw new Error("Unable to locate the source Jvedio app base directory for C-3 regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<C3RegressionCheckResult> {
  try {
    const details = await action();
    return {
      details,
      issue: null,
      name,
      passed: true,
    };
  } catch (error) {
    const issue = error instanceof Error ? error.message : String(error);
    return {
      details: "执行失败",
      issue,
      name,
      passed: false,
    };
  }
}

async function getRendererSnapshot(mainWindow: BrowserWindow): Promise<RendererSnapshot> {
  return executeInRenderer<RendererSnapshot>(
    mainWindow,
    `
      (() => ({
        hash: location.hash,
        infoBanner: document.querySelector(".info-banner")?.textContent?.trim() ?? null,
        inlineError: document.querySelector(".error-banner, .inline-error")?.textContent?.trim() ?? null,
        libraryCards: Array.from(document.querySelectorAll(".library-title"))
          .map((item) => item.textContent?.trim() ?? "")
          .filter((item) => item.length > 0),
        navItems: Array.from(document.querySelectorAll(".nav-section .nav-link span"))
          .map((item) => item.textContent?.trim() ?? "")
          .filter((item) => item.length > 0),
        taskSummaryLastUpdatedUtc: document.querySelector(".worker-note")?.getAttribute("data-last-updated-utc") ?? null,
        title: document.querySelector(".content-header h1")?.textContent?.trim() ?? "",
        workerWarning: document.querySelector(".warning-banner")?.textContent?.trim() ?? null
      }))()
    `,
  );
}

async function getWorkerBaseUrl(mainWindow: BrowserWindow): Promise<string> {
  return executeInRenderer<string>(
    mainWindow,
    `window.jvedioWorker.getWorkerBaseUrl()`,
  );
}

function logCheckResult(result: C3RegressionCheckResult): void {
  if (result.passed) {
    console.log(`[C3-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[C3-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
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

    await delay(200);
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
