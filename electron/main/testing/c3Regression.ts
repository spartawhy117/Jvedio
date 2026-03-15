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

interface RendererSnapshot {
  hash: string;
  infoBanner: string | null;
  inlineError: string | null;
  libraryCards: string[];
  navItems: string[];
  title: string;
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
): Promise<boolean> {
  const createdLibraryName = `C3 Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;
  const createdScanPath = `D:\\Jvedio-C3-Regression\\${createdLibraryName.replace(/\s+/g, "-")}`;

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
  return deleteLibrary.passed;
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
        title: document.querySelector(".content-header h1")?.textContent?.trim() ?? ""
      }))()
    `,
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
