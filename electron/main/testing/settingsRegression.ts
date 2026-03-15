import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";

const REGRESSION_FLAG = "--regression-settings";
const RENDERER_WAIT_TIMEOUT_MS = 20000;

export interface SettingsRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface SettingsRegressionEnvironment {
  appBaseDir: string;
  checks: SettingsRegressionCheckResult[];
  disposeMetaTubeStub: () => Promise<void>;
  metaTubeStubUrl: string;
  sourceAppBaseDir: string;
}

export async function prepareSettingsRegressionEnvironment(electronRoot: string): Promise<SettingsRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-settings-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));

  process.env.JVEDIO_APP_BASE_DIR = runRoot;

  const metaTubeStub = await startMetaTubeStubServer();

  console.log("[Settings-Regression] Prepared isolated app base directory:", runRoot);

  return {
    appBaseDir: runRoot,
    checks: [],
    disposeMetaTubeStub: metaTubeStub.close,
    metaTubeStubUrl: metaTubeStub.url,
    sourceAppBaseDir,
  };
}

export async function runSettingsRegression(
  mainWindow: BrowserWindow,
  environment: SettingsRegressionEnvironment,
): Promise<boolean> {
  console.log("[Settings-Regression] Starting focused regression for settings page.");

  try {
    await waitForCondition(
      mainWindow,
      `(() => Boolean(document.querySelector('.content-header h1')))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "应用首页未在预期时间内完成初始渲染。",
    );

    const readCheck = await captureCheck("设置读取", async () => {
      await navigateToSettings(mainWindow, "general");
      await waitForCondition(
        mainWindow,
        `
          (() => {
            const language = document.querySelector('[data-settings-group="general"][data-settings-field="currentLanguage"]');
            return location.hash.startsWith('#/settings') && language instanceof HTMLSelectElement;
          })()
        `,
        RENDERER_WAIT_TIMEOUT_MS,
        "设置页未成功加载。",
      );

      const snapshot = await executeInRenderer<{
        debugChecked: boolean;
        language: string;
      }>(
        mainWindow,
        `
          (() => ({
            debugChecked: Boolean(document.querySelector('[data-settings-group="general"][data-settings-field="debug"]')?.checked),
            language: document.querySelector('[data-settings-group="general"][data-settings-field="currentLanguage"]')?.value ?? '',
          }))()
        `,
      );

      if (!snapshot.language) {
        throw new Error("设置页未回读当前语言。");
      }

      return `language=${snapshot.language}, debug=${snapshot.debugChecked}`;
    });
    environment.checks.push(readCheck);
    logCheckResult(readCheck);
    if (!readCheck.passed) return false;

    const saveCheck = await captureCheck("设置保存", async () => {
      await updateSettingsGroup(mainWindow, "general", `
        (() => {
          const language = document.querySelector('[data-settings-group="general"][data-settings-field="currentLanguage"]');
          const debug = document.querySelector('[data-settings-group="general"][data-settings-field="debug"]');
          if (!(language instanceof HTMLSelectElement) || !(debug instanceof HTMLInputElement)) {
            throw new Error("General 表单控件不完整。");
          }
          language.value = 'en-US';
          language.dispatchEvent(new Event('change', { bubbles: true }));
          debug.checked = true;
          debug.dispatchEvent(new Event('input', { bubbles: true }));
        })()
      `);

      await updateSettingsGroup(mainWindow, "metaTube", `
        (() => {
          const serverUrl = document.querySelector('[data-settings-group="metaTube"][data-settings-field="serverUrl"]');
          const timeout = document.querySelector('[data-settings-group="metaTube"][data-settings-field="requestTimeoutSeconds"]');
          if (!(serverUrl instanceof HTMLInputElement) || !(timeout instanceof HTMLInputElement)) {
            throw new Error("MetaTube 表单控件不完整。");
          }
          serverUrl.value = ${JSON.stringify(environment.metaTubeStubUrl)};
          serverUrl.dispatchEvent(new Event('input', { bubbles: true }));
          timeout.value = '90';
          timeout.dispatchEvent(new Event('input', { bubbles: true }));
        })()
      `);

      await updateSettingsGroup(mainWindow, "playback", `
        (() => {
          const playerPath = document.querySelector('[data-settings-group="playback"][data-settings-field="playerPath"]');
          const fallback = document.querySelector('[data-settings-group="playback"][data-settings-field="useSystemDefaultFallback"]');
          if (!(playerPath instanceof HTMLInputElement) || !(fallback instanceof HTMLInputElement)) {
            throw new Error("Playback 表单控件不完整。");
          }
          playerPath.value = 'C:\\\\SettingsRegression\\\\player.exe';
          playerPath.dispatchEvent(new Event('input', { bubbles: true }));
          fallback.checked = false;
          fallback.dispatchEvent(new Event('input', { bubbles: true }));
        })()
      `);

      await executeInRenderer(
        mainWindow,
        `
          (() => {
            const saveButton = document.querySelector('[data-action="save-settings"]');
            if (!(saveButton instanceof HTMLElement)) throw new Error("未找到设置保存按钮。");
            saveButton.click();
          })()
        `,
      );

      await waitForCondition(
        mainWindow,
        `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('设置已保存'))()`,
        RENDERER_WAIT_TIMEOUT_MS,
        "保存设置后未显示成功反馈。",
      );

      const settings = await fetchSettingsSnapshot(await getWorkerBaseUrl(mainWindow));
      if (!settings || settings.general.currentLanguage !== "en-US" || !settings.general.debug || settings.metaTube.serverUrl !== environment.metaTubeStubUrl || settings.metaTube.requestTimeoutSeconds !== 90 || settings.playback.playerPath !== "C:\\SettingsRegression\\player.exe" || settings.playback.useSystemDefaultFallback) {
        throw new Error(`设置保存后回读值不符合预期: ${JSON.stringify(settings)}`);
      }

      return "已保存 General / MetaTube / Playback 设置";
    });
    environment.checks.push(saveCheck);
    logCheckResult(saveCheck);
    if (!saveCheck.passed) return false;

    const diagnosticsCheck = await captureCheck("MetaTube diagnostics", async () => {
      await navigateToSettings(mainWindow, "metaTube");
      await executeInRenderer(
        mainWindow,
        `
          (() => {
            const button = document.querySelector('[data-action="run-meta-tube-diagnostics"]');
            if (!(button instanceof HTMLElement)) throw new Error("未找到 MetaTube diagnostics 按钮。");
            button.click();
          })()
        `,
      );

      await waitForCondition(
        mainWindow,
        `(() => document.querySelector('[data-settings-diagnostics-status="success"]') !== null)()`,
        RENDERER_WAIT_TIMEOUT_MS,
        "MetaTube diagnostics 未在预期时间内完成。",
      );

      const snapshot = await executeInRenderer<{
        steps: number;
        summary: string;
      }>(
        mainWindow,
        `
          (() => ({
            steps: document.querySelectorAll('[data-settings-diagnostics-step]').length,
            summary: document.querySelector('[data-settings-diagnostics-summary]')?.textContent?.trim() ?? '',
          }))()
        `,
      );

      if (snapshot.steps < 4) {
        throw new Error(`MetaTube diagnostics 步骤数不足: ${snapshot.steps}`);
      }

      return snapshot.summary;
    });
    environment.checks.push(diagnosticsCheck);
    logCheckResult(diagnosticsCheck);
    if (!diagnosticsCheck.passed) return false;

    const settingsChangedCheck = await captureCheck("settings.changed 消费", async () => {
      await navigateToSettings(mainWindow, "general");
      await executeInRenderer(
        mainWindow,
        `
          (() => {
            const language = document.querySelector('[data-settings-group="general"][data-settings-field="currentLanguage"]');
            if (!(language instanceof HTMLSelectElement)) throw new Error("未找到语言选择框。");
            language.value = 'zh-CN';
            language.dispatchEvent(new Event('change', { bubbles: true }));
          })()
        `,
      );

      const workerBaseUrl = await getWorkerBaseUrl(mainWindow);
      const response = await fetch(`${workerBaseUrl}/api/settings`, {
        body: JSON.stringify({
          general: { currentLanguage: "ja-JP", debug: false },
          metaTube: { requestTimeoutSeconds: 75, serverUrl: environment.metaTubeStubUrl },
          playback: { playerPath: "C:\\\\SettingsRegression\\\\player.exe", useSystemDefaultFallback: true },
          resetToDefaults: false,
        }),
        headers: { "Content-Type": "application/json" },
        method: "PUT",
      });
      const payload = await response.json() as { success: boolean; };
      if (!response.ok || !payload.success) {
        throw new Error("通过 API 触发 settings.changed 失败。");
      }

      await waitForCondition(
        mainWindow,
        `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('保留未保存修改'))()`,
        RENDERER_WAIT_TIMEOUT_MS,
        "renderer 未消费 settings.changed 或未提示保留草稿。",
      );

      const snapshot = await executeInRenderer<{
        draftLanguage: string;
        persistedLanguage: string;
      }>(
        mainWindow,
        `
          (() => ({
            draftLanguage: document.querySelector('[data-settings-group="general"][data-settings-field="currentLanguage"]')?.value ?? '',
            persistedLanguage: document.querySelector('.metric-card strong')?.textContent?.trim() ?? '',
          }))()
        `,
      );

      if (snapshot.draftLanguage !== "zh-CN" || snapshot.persistedLanguage !== "ja-JP") {
        throw new Error(`settings.changed 消费结果不符合预期: ${JSON.stringify(snapshot)}`);
      }

      return `draft=${snapshot.draftLanguage}, persisted=${snapshot.persistedLanguage}`;
    });
    environment.checks.push(settingsChangedCheck);
    logCheckResult(settingsChangedCheck);
    if (!settingsChangedCheck.passed) return false;

    const resetCheck = await captureCheck("恢复默认", async () => {
      await executeInRenderer(
        mainWindow,
        `
          (() => {
            const resetButton = document.querySelector('[data-action="reset-settings"]');
            if (!(resetButton instanceof HTMLElement)) throw new Error("未找到恢复默认按钮。");
            resetButton.click();
          })()
        `,
      );

      await waitForCondition(
        mainWindow,
        `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('已恢复默认设置'))()`,
        RENDERER_WAIT_TIMEOUT_MS,
        "恢复默认后未显示成功反馈。",
      );

      const settings = await fetchSettingsSnapshot(await getWorkerBaseUrl(mainWindow));
      if (!settings || settings.general.currentLanguage !== "zh-CN" || settings.general.debug || settings.metaTube.serverUrl !== "" || settings.metaTube.requestTimeoutSeconds !== 60 || settings.playback.playerPath !== "" || !settings.playback.useSystemDefaultFallback) {
        throw new Error(`恢复默认后回读值不符合预期: ${JSON.stringify(settings)}`);
      }

      return "已恢复到默认设置快照";
    });
    environment.checks.push(resetCheck);
    logCheckResult(resetCheck);
    return resetCheck.passed;
  } finally {
    await environment.disposeMetaTubeStub();
  }
}

async function navigateToSettings(mainWindow: BrowserWindow, group: "general" | "metaTube" | "playback"): Promise<void> {
  try {
    await executeInRenderer(
      mainWindow,
      `(() => { location.hash = ${JSON.stringify(group === "general" ? "#/settings" : `#/settings?group=${group}`)}; return true; })()`,
    );
  } catch (error) {
    const snapshot = await executeInRenderer<{
      bodyText: string;
      hash: string;
      title: string;
    }>(
      mainWindow,
      `
        (() => ({
          bodyText: document.body?.innerText ?? '',
          hash: location.hash,
          title: document.querySelector('.content-header h1')?.textContent?.trim() ?? '',
        }))()
      `,
    );
    throw new Error(`设置路由跳转脚本失败: ${error instanceof Error ? error.message : String(error)} 快照=${JSON.stringify(snapshot)}`);
  }

  await waitForCondition(
    mainWindow,
    `
      (() => {
        const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
        return location.hash.startsWith('#/settings') && title === '设置';
      })()
    `,
    RENDERER_WAIT_TIMEOUT_MS,
    "未成功进入设置页面。",
  );
}

async function updateSettingsGroup(mainWindow: BrowserWindow, group: "general" | "metaTube" | "playback", expression: string): Promise<void> {
  await navigateToSettings(mainWindow, group);
  await executeInRenderer(mainWindow, expression);
}

async function getWorkerBaseUrl(mainWindow: BrowserWindow): Promise<string> {
  return executeInRenderer<string>(mainWindow, `(() => window.jvedioWorker.getWorkerBaseUrl())()`);
}

async function fetchSettingsSnapshot(workerBaseUrl: string): Promise<{
  general: { currentLanguage: string; debug: boolean; };
  metaTube: { requestTimeoutSeconds: number; serverUrl: string; };
  playback: { playerPath: string; useSystemDefaultFallback: boolean; };
} | null> {
  const response = await fetch(`${workerBaseUrl}/api/settings`);
  const payload = await response.json() as {
    data: {
      general: { currentLanguage: string; debug: boolean; };
      metaTube: { requestTimeoutSeconds: number; serverUrl: string; };
      playback: { playerPath: string; useSystemDefaultFallback: boolean; };
    } | null;
  };
  return payload.data;
}

async function startMetaTubeStubServer(): Promise<{
  close: () => Promise<void>;
  url: string;
}> {
  const server = http.createServer((request, response) => {
    const baseUrl = `http://${request.headers.host ?? "127.0.0.1"}`;
    const url = new URL(request.url ?? "/", baseUrl);
    const writeJson = (data: unknown, statusCode = 200): void => {
      response.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
      response.end(JSON.stringify({ data, error: null }));
    };

    if (request.method !== "GET") {
      writeJson({ message: "method not allowed" }, 405);
      return;
    }

    if (url.pathname === "/") {
      writeJson({ service: "MetaTubeStub", status: "ok" });
      return;
    }

    if (url.pathname === "/v1/providers") {
      writeJson({
        actor_providers: { stub: "Stub Actor Provider" },
        movie_providers: { stub: "Stub Movie Provider" },
      });
      return;
    }

    if (url.pathname === "/v1/movies/search") {
      const query = url.searchParams.get("q") ?? "IPX-001";
      writeJson([{
        actors: ["Regression Actor"],
        cover_url: `${baseUrl}/assets/${query}-cover.jpg`,
        homepage: `${baseUrl}/movies/${query}`,
        id: "movie-regression",
        number: query,
        provider: "stub",
        score: 98,
        thumb_url: `${baseUrl}/assets/${query}-thumb.jpg`,
        title: `${query} regression movie`,
      }]);
      return;
    }

    if (url.pathname === "/v1/movies/stub/movie-regression") {
      writeJson({
        actors: ["Regression Actor"],
        big_cover_url: `${baseUrl}/assets/IPX-001-fanart.jpg`,
        big_thumb_url: `${baseUrl}/assets/IPX-001-thumb-large.jpg`,
        cover_url: `${baseUrl}/assets/IPX-001-cover.jpg`,
        director: "Regression Director",
        genres: ["Drama"],
        homepage: `${baseUrl}/movies/IPX-001`,
        id: "movie-regression",
        label: "Regression Label",
        maker: "Regression Studio",
        number: "IPX-001",
        preview_images: [`${baseUrl}/assets/IPX-001-preview-1.jpg`],
        provider: "stub",
        release_date: "2026-03-16T00:00:00Z",
        runtime: 120,
        score: 98,
        series: "Regression Series",
        summary: "Regression detail summary",
        thumb_url: `${baseUrl}/assets/IPX-001-thumb.jpg`,
        title: "IPX-001 regression movie",
      });
      return;
    }

    writeJson({ message: "not found" }, 404);
  });

  const address = await new Promise<import("node:net").AddressInfo>((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const currentAddress = server.address();
      if (!currentAddress || typeof currentAddress === "string") {
        reject(new Error("MetaTube stub server did not expose a TCP address."));
        return;
      }

      resolve(currentAddress);
    });
  });

  return {
    close: async () => {
      if (!server.listening) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
    url: `http://127.0.0.1:${address.port}`,
  };
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

  throw new Error("Unable to locate the source Jvedio app base directory for settings regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<SettingsRegressionCheckResult> {
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

function logCheckResult(result: SettingsRegressionCheckResult): void {
  if (result.passed) {
    console.log(`[Settings-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[Settings-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
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

  throw new Error(timeoutMessage);
}

async function executeInRenderer<TResult>(mainWindow: BrowserWindow, expression: string): Promise<TResult> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<TResult>;
}
