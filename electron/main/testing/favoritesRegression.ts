import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const REGRESSION_FLAG = "--regression-favorites";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_VIDEO_SIZE_BYTES = 12 * 1024 * 1024;
const SAMPLE_VIDEOS = [
  { favoriteCount: 3, fileName: "ABP-123.mp4", vid: "ABP-123" },
  { favoriteCount: 1, fileName: "JUR-293-C.mp4", vid: "JUR-293-C" },
] as const;

export interface FavoritesRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface FavoritesRegressionEnvironment {
  appBaseDir: string;
  appDataDbPath: string;
  checks: FavoritesRegressionCheckResult[];
  sampleLibraryPath: string;
  sourceAppBaseDir: string;
}

export async function prepareFavoritesRegressionEnvironment(electronRoot: string): Promise<FavoritesRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-favorites-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "favorites-library");
  const appDataDbPath = path.join(targetUserDataDir, "app_datas.sqlite");

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.mkdir(sampleLibraryPath, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), appDataDbPath);
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));

  for (const sample of SAMPLE_VIDEOS) {
    await fsPromises.writeFile(path.join(sampleLibraryPath, sample.fileName), Buffer.alloc(SAMPLE_VIDEO_SIZE_BYTES, 7));
  }

  process.env.JVEDIO_APP_BASE_DIR = runRoot;

  console.log("[Favorites-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[Favorites-Regression] Sample library path:", sampleLibraryPath);

  return {
    appBaseDir: runRoot,
    appDataDbPath,
    checks: [],
    sampleLibraryPath,
    sourceAppBaseDir,
  };
}

export async function runFavoritesRegression(
  mainWindow: BrowserWindow,
  environment: FavoritesRegressionEnvironment,
): Promise<boolean> {
  const libraryName = `Favorites Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("[Favorites-Regression] Starting focused regression for favorites page.");

  const createLibrary = await captureCheck("准备 Favorites 测试库", async () => {
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
      "新建媒体库后 Home 未出现 Favorites 测试库。",
    );

    await navigateToLibrary(mainWindow, libraryName);
    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) return false;

  const scanAndSeedFavorites = await captureCheck("扫描样例影片并标记收藏", async () => {
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

    seedFavoriteCounts(environment.appDataDbPath);
    return "已完成扫描并向样例影片写入 FavoriteCount";
  });
  environment.checks.push(scanAndSeedFavorites);
  logCheckResult(scanAndSeedFavorites);
  if (!scanAndSeedFavorites.passed) return false;

  const favoritesRoute = await captureCheck("Favorites 路由壳与结果集", async () => {
    await navigateToFavorites(mainWindow);
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return location.hash.startsWith('#/favorites')
            && title === '收藏夹'
            && document.querySelectorAll('.video-result-card').length === 2;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "未成功进入 Favorites 页面，或结果集数量不符合预期。",
    );

    return "已进入 Favorites 页面并展示 2 条收藏结果";
  });
  environment.checks.push(favoritesRoute);
  logCheckResult(favoritesRoute);
  if (!favoritesRoute.passed) return false;

  const filterSortRefresh = await captureCheck("Favorites 筛选、排序、刷新", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const keyword = document.querySelector('[data-favorites-query-field="keyword"]');
          const apply = document.querySelector('[data-action="apply-favorites-query"]');
          if (!(keyword instanceof HTMLInputElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到 Favorites 筛选控件。");
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
      "Favorites 关键字筛选后未只保留 ABP-123。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const reset = document.querySelector('[data-action="reset-favorites-query"]');
          const sortBy = document.querySelector('[data-favorites-query-field="sortBy"]');
          const order = document.querySelector('[data-favorites-query-field="sortOrder"]');
          const apply = document.querySelector('[data-action="apply-favorites-query"]');
          if (!(reset instanceof HTMLElement) || !(sortBy instanceof HTMLSelectElement) || !(order instanceof HTMLSelectElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到 Favorites 排序控件。");
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
          return codes.length === 2
            && codes[0] === 'ABP-123'
            && codes[1] === 'JUR-293-C'
            && location.hash.includes('sortBy=vid')
            && location.hash.includes('sortOrder=asc');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "Favorites 按 VID 升序排序后结果顺序不符合预期。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const refresh = document.querySelector('[data-action="refresh-favorites"]');
          if (!(refresh instanceof HTMLElement)) throw new Error("未找到 Favorites 刷新按钮。");
          refresh.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('Favorites 结果集'))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "刷新 Favorites 结果后未显示成功反馈。",
    );

    return "已验证 Favorites 关键字筛选、VID 升序排序和刷新";
  });
  environment.checks.push(filterSortRefresh);
  logCheckResult(filterSortRefresh);
  if (!filterSortRefresh.passed) return false;

  const detailAndBack = await captureCheck("Favorites 到影片详情并返回", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const target = Array.from(document.querySelectorAll('.video-result-card a')).find((item) => item.textContent?.includes('ABP-123'));
          if (!(target instanceof HTMLElement)) throw new Error("未找到 ABP-123 的详情入口。");
          target.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          const backButtonText = document.querySelector('[data-action="navigate-back-to"]')?.textContent?.trim() ?? '';
          return location.hash.startsWith('#/videos/')
            && title.includes('ABP-123')
            && backButtonText === '返回 Favorites';
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "从 Favorites 进入影片详情后，返回按钮文案或详情页状态不符合预期。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="navigate-back-to"]');
          if (!(button instanceof HTMLElement)) throw new Error("未找到返回 Favorites 按钮。");
          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return location.hash.startsWith('#/favorites')
            && location.hash.includes('sortBy=vid')
            && location.hash.includes('sortOrder=asc')
            && title === '收藏夹'
            && document.querySelectorAll('.video-result-card').length === 2;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "从影片详情返回 Favorites 后未恢复原列表状态。",
    );

    return `返回后路由=${await executeInRenderer<string>(mainWindow, '(() => location.hash)()')}`;
  });
  environment.checks.push(detailAndBack);
  logCheckResult(detailAndBack);
  return detailAndBack.passed;
}

function seedFavoriteCounts(appDataDbPath: string): void {
  const database = new DatabaseSync(appDataDbPath);
  try {
    const update = database.prepare(
      `
        UPDATE metadata
        SET FavoriteCount = $favoriteCount,
            UpdateDate = STRFTIME('%Y-%m-%d %H:%M:%S', 'NOW', 'localtime')
        WHERE DataID IN (
          SELECT metadata_video.DataID
          FROM metadata_video
          WHERE metadata_video.VID = $vid
        );
      `,
    );

    for (const sample of SAMPLE_VIDEOS) {
      update.run({
        $favoriteCount: sample.favoriteCount,
        $vid: sample.vid,
      });
    }
  } finally {
    database.close();
  }
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

async function navigateToFavorites(mainWindow: BrowserWindow): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const target = Array.from(document.querySelectorAll('.primary-nav .nav-link')).find((item) => item.textContent?.includes('Favorites'));
        if (!(target instanceof HTMLElement)) throw new Error("未找到 Favorites 导航入口。");
        target.click();
      })()
    `,
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

  throw new Error("Unable to locate the source Jvedio app base directory for Favorites regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<FavoritesRegressionCheckResult> {
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

function logCheckResult(result: FavoritesRegressionCheckResult): void {
  if (result.passed) {
    console.log(`[Favorites-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[Favorites-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
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
      (() => JSON.stringify({
        hash: location.hash,
        title: document.querySelector('.content-header h1')?.textContent?.trim() ?? '',
        infoBanner: document.querySelector('.info-banner')?.textContent?.trim() ?? '',
        errorBanner: document.querySelector('.error-banner')?.textContent?.trim() ?? '',
        favoriteCards: document.querySelectorAll('.video-result-card').length,
        favoriteCodes: Array.from(document.querySelectorAll('.video-result-card .code-pill')).map((item) => item.textContent?.trim() ?? ''),
        activePrimaryNav: Array.from(document.querySelectorAll('.primary-nav .nav-link.active')).map((item) => item.textContent?.trim() ?? ''),
      }))()
    `,
  );
  throw new Error(`${timeoutMessage} 快照=${snapshot}`);
}

async function executeInRenderer<TResult>(mainWindow: BrowserWindow, expression: string): Promise<TResult> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<TResult>;
}
