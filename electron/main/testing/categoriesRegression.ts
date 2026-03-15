import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const REGRESSION_FLAG = "--regression-categories";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_VIDEO_SIZE_BYTES = 12 * 1024 * 1024;
const SAMPLE_VIDEOS = [
  { fileName: "ABP-123.mp4", genre: "Drama;制服", vid: "ABP-123" },
  { fileName: "JUR-293-C.mp4", genre: "Drama;人妻", vid: "JUR-293-C" },
] as const;

export interface CategoriesRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface CategoriesRegressionEnvironment {
  appBaseDir: string;
  appDataDbPath: string;
  checks: CategoriesRegressionCheckResult[];
  sampleLibraryPath: string;
  sourceAppBaseDir: string;
}

export async function prepareCategoriesRegressionEnvironment(electronRoot: string): Promise<CategoriesRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-categories-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "categories-library");
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

  console.log("[Categories-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[Categories-Regression] Sample library path:", sampleLibraryPath);

  return {
    appBaseDir: runRoot,
    appDataDbPath,
    checks: [],
    sampleLibraryPath,
    sourceAppBaseDir,
  };
}

export async function runCategoriesRegression(
  mainWindow: BrowserWindow,
  environment: CategoriesRegressionEnvironment,
): Promise<boolean> {
  const libraryName = `Categories Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("[Categories-Regression] Starting focused regression for category page.");

  const createLibrary = await captureCheck("准备 Categories 测试库", async () => {
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
      "新建媒体库后 Home 未出现 Categories 测试库。",
    );

    await navigateToLibrary(mainWindow, libraryName);
    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) return false;

  const scanAndSeedCategories = await captureCheck("扫描样例影片并写入类别", async () => {
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

    seedCategories(environment.appDataDbPath);
    return "已完成扫描并向样例影片写入 Genre";
  });
  environment.checks.push(scanAndSeedCategories);
  logCheckResult(scanAndSeedCategories);
  if (!scanAndSeedCategories.passed) return false;

  const categoriesRoute = await captureCheck("Categories 路由壳与类别列表", async () => {
    await navigateToCategories(mainWindow);
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          const groupNames = Array.from(document.querySelectorAll('[data-category-group-name]')).map((item) => item.getAttribute('data-category-group-name') ?? '');
          return location.hash.startsWith('#/categories')
            && title === '类别'
            && groupNames.includes('Drama')
            && groupNames.includes('制服')
            && groupNames.includes('人妻');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "未成功进入 Categories 页面，或类别列表不符合预期。",
    );

    return "已进入 Categories 页面并展示 Drama / 制服 / 人妻";
  });
  environment.checks.push(categoriesRoute);
  logCheckResult(categoriesRoute);
  if (!categoriesRoute.passed) return false;

  const groupSelection = await captureCheck("类别切换与结果集展示", async () => {
    await clickCategoryGroup(mainWindow, "Drama");
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return title === '类别 · Drama'
            && document.querySelectorAll('.video-result-card').length === 2
            && location.hash.includes('name=Drama');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "选择 Drama 后，类别结果集未展示 2 部影片。",
    );

    await clickCategoryGroup(mainWindow, "制服");
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const cards = Array.from(document.querySelectorAll('.video-result-card'));
          return location.hash.includes('name=%E5%88%B6%E6%9C%8D')
            && cards.length === 1
            && cards[0]?.textContent?.includes('ABP-123');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "选择 制服 后，类别结果集未收敛到 ABP-123。",
    );

    return "已验证 Drama 与 制服 两个类别的结果集切换";
  });
  environment.checks.push(groupSelection);
  logCheckResult(groupSelection);
  if (!groupSelection.passed) return false;

  const filterSortRefresh = await captureCheck("类别筛选、排序、刷新", async () => {
    await clickCategoryGroup(mainWindow, "Drama");
    await waitForCondition(
      mainWindow,
      `(() => location.hash.includes('name=Drama') && document.querySelectorAll('.video-result-card').length === 2)()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "切回 Drama 类别后未恢复 2 条结果。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const keyword = document.querySelector('[data-category-query-field="keyword"]');
          const apply = document.querySelector('[data-action="apply-category-query"]');
          if (!(keyword instanceof HTMLInputElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到类别筛选控件。");
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
      "类别关键字筛选后未只保留 ABP-123。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const reset = document.querySelector('[data-action="reset-category-query"]');
          const sortBy = document.querySelector('[data-category-query-field="sortBy"]');
          const order = document.querySelector('[data-category-query-field="sortOrder"]');
          const apply = document.querySelector('[data-action="apply-category-query"]');
          if (!(reset instanceof HTMLElement) || !(sortBy instanceof HTMLSelectElement) || !(order instanceof HTMLSelectElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到类别排序控件。");
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
      "类别按 VID 升序排序后结果顺序不符合预期。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const refresh = document.querySelector('[data-action="refresh-categories"]');
          if (!(refresh instanceof HTMLElement)) throw new Error("未找到类别刷新按钮。");
          refresh.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `(() => (document.querySelector('.info-banner')?.textContent ?? '').includes('类别结果集'))()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "刷新类别结果后未显示成功反馈。",
    );

    return "已验证类别关键字筛选、VID 升序排序和刷新";
  });
  environment.checks.push(filterSortRefresh);
  logCheckResult(filterSortRefresh);
  if (!filterSortRefresh.passed) return false;

  const detailAndBack = await captureCheck("Categories 到影片详情并返回", async () => {
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
            && backButtonText === '返回类别';
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "从类别进入影片详情后，返回按钮文案或详情页状态不符合预期。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="navigate-back-to"]');
          if (!(button instanceof HTMLElement)) throw new Error("未找到返回类别按钮。");
          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return location.hash.startsWith('#/categories')
            && location.hash.includes('name=Drama')
            && location.hash.includes('sortBy=vid')
            && location.hash.includes('sortOrder=asc')
            && title === '类别 · Drama'
            && document.querySelectorAll('.video-result-card').length === 2;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "从影片详情返回类别后未恢复原列表状态。",
    );

    return `返回后路由=${await executeInRenderer<string>(mainWindow, "(() => location.hash)()")}`;
  });
  environment.checks.push(detailAndBack);
  logCheckResult(detailAndBack);
  return detailAndBack.passed;
}

function seedCategories(appDataDbPath: string): void {
  const database = new DatabaseSync(appDataDbPath);
  try {
    const update = database.prepare(
      `
        UPDATE metadata
        SET Genre = $genre,
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
        $genre: sample.genre,
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

async function navigateToCategories(mainWindow: BrowserWindow): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const target = Array.from(document.querySelectorAll('.primary-nav .nav-link')).find((item) => item.textContent?.includes('Categories'));
        if (!(target instanceof HTMLElement)) throw new Error("未找到 Categories 导航入口。");
        target.click();
      })()
    `,
  );
}

async function clickCategoryGroup(mainWindow: BrowserWindow, groupName: string): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const target = Array.from(document.querySelectorAll('[data-category-group-name]')).find((item) => item.getAttribute('data-category-group-name') === ${JSON.stringify(groupName)});
        if (!(target instanceof HTMLElement)) throw new Error("未找到目标类别入口。");
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

  throw new Error("Unable to locate the source Jvedio app base directory for Categories regression.");
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<CategoriesRegressionCheckResult> {
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

function logCheckResult(result: CategoriesRegressionCheckResult): void {
  if (result.passed) {
    console.log(`[Categories-Regression] PASS ${result.name}: ${result.details}`);
    return;
  }

  console.error(`[Categories-Regression] FAIL ${result.name}: ${result.issue ?? result.details}`);
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
        categoryGroups: Array.from(document.querySelectorAll('[data-category-group-name]')).map((item) => item.getAttribute('data-category-group-name') ?? ''),
        videoCards: document.querySelectorAll('.video-result-card').length,
        videoCodes: Array.from(document.querySelectorAll('.video-result-card .code-pill')).map((item) => item.textContent?.trim() ?? ''),
        activePrimaryNav: Array.from(document.querySelectorAll('.primary-nav .nav-link.active')).map((item) => item.textContent?.trim() ?? ''),
      }))()
    `,
  );
  throw new Error(`${timeoutMessage} 快照=${snapshot}`);
}

async function executeInRenderer<TResult>(mainWindow: BrowserWindow, expression: string): Promise<TResult> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<TResult>;
}
