import { BrowserWindow } from "electron";
import fs from "node:fs";
import fsPromises from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const REGRESSION_FLAG = "--regression-actors";
const RENDERER_WAIT_TIMEOUT_MS = 20000;
const TASK_WAIT_TIMEOUT_MS = 120000;
const SAMPLE_AVATAR_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wn8xWkAAAAASUVORK5CYII=";
const SAMPLE_VIDEO_SIZE_BYTES = 10 * 1024 * 1024;
const SAMPLE_VIDEOS = [
  { fileName: "ABP-123.mp4", vid: "ABP-123" },
  { fileName: "JUR-293-C.mp4", vid: "JUR-293-C" },
  { fileName: "IPX-001.mp4", vid: "IPX-001" },
] as const;

export interface ActorsRegressionCheckResult {
  details: string;
  issue: string | null;
  name: string;
  passed: boolean;
}

export interface ActorsRegressionEnvironment {
  appBaseDir: string;
  checks: ActorsRegressionCheckResult[];
  sampleLibraryPath: string;
  sourceAppBaseDir: string;
}

export async function prepareActorsRegressionEnvironment(electronRoot: string): Promise<ActorsRegressionEnvironment | null> {
  if (!process.argv.includes(REGRESSION_FLAG)) {
    return null;
  }

  const sourceAppBaseDir = resolveReleaseAppBaseDir(electronRoot);
  const runRoot = await fsPromises.mkdtemp(path.join(os.tmpdir(), "jvedio-actors-regression-"));
  const currentUser = os.userInfo().username;
  const sourceUserDataDir = path.join(sourceAppBaseDir, "data", currentUser);
  const targetUserDataDir = path.join(runRoot, "data", currentUser);
  const sampleLibraryPath = path.join(runRoot, "regression-media", "actors-library");

  await fsPromises.mkdir(targetUserDataDir, { recursive: true });
  await fsPromises.mkdir(sampleLibraryPath, { recursive: true });
  await fsPromises.copyFile(path.join(sourceAppBaseDir, "Jvedio.exe"), path.join(runRoot, "Jvedio.exe"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_datas.sqlite"), path.join(targetUserDataDir, "app_datas.sqlite"));
  await fsPromises.copyFile(path.join(sourceUserDataDir, "app_configs.sqlite"), path.join(targetUserDataDir, "app_configs.sqlite"));

  for (const sample of SAMPLE_VIDEOS) {
    await fsPromises.writeFile(path.join(sampleLibraryPath, sample.fileName), Buffer.alloc(SAMPLE_VIDEO_SIZE_BYTES, 5));
  }

  process.env.JVEDIO_APP_BASE_DIR = runRoot;

  console.log("[Actors-Regression] Prepared isolated app base directory:", runRoot);
  console.log("[Actors-Regression] Sample library path:", sampleLibraryPath);

  return {
    appBaseDir: runRoot,
    checks: [],
    sampleLibraryPath,
    sourceAppBaseDir,
  };
}

export async function runActorsRegression(
  mainWindow: BrowserWindow,
  environment: ActorsRegressionEnvironment,
): Promise<boolean> {
  const libraryName = `Actors Regression ${new Date().toISOString().replace(/[:.]/g, "-")}`;

  console.log("[Actors-Regression] Starting focused regression for actors page.");

  const createLibrary = await captureCheck("准备演员回归测试库", async () => {
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
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          return title === '媒体库总览' && Array.from(document.querySelectorAll('.library-title')).some((item) => item.textContent?.trim() === ${JSON.stringify(libraryName)});
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "演员回归测试库创建后未出现在 Home 列表。",
    );

    await navigateToLibrary(mainWindow, libraryName);
    return `已创建媒体库 ${libraryName}`;
  });
  environment.checks.push(createLibrary);
  logCheckResult(createLibrary);
  if (!createLibrary.passed) return false;

  const scanLibrary = await captureCheck("扫描样例影片并注入演员关联", async () => {
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
      `(() => document.querySelectorAll('.video-result-card').length === 3)()`,
      RENDERER_WAIT_TIMEOUT_MS,
      "扫描完成后库页未展示 3 个影片结果。",
    );

    const hash = await executeInRenderer<string>(mainWindow, `(() => location.hash)()`);
    const libraryId = hash.replace(/^#\/libraries\//, "").split("?")[0]?.trim() ?? "";
    if (!libraryId) {
      throw new Error(`当前库路由未包含 libraryId: ${hash}`);
    }

    await seedActorRows(environment.appBaseDir, libraryId);

    return `已完成扫描并向库 ${libraryId} 注入演员映射`;
  });
  environment.checks.push(scanLibrary);
  logCheckResult(scanLibrary);
  if (!scanLibrary.passed) return false;

  const actorsRoute = await captureCheck("Actors 路由壳与结果集", async () => {
    await navigateToActors(mainWindow);
    await waitForCondition(
      mainWindow,
      `
        (() => {
          const title = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          const imageAvatars = document.querySelectorAll('[data-actor-avatar-state="image"]').length;
          const placeholders = document.querySelectorAll('[data-actor-avatar-state="placeholder"]').length;
          return location.hash.startsWith('#/actors')
            && title === '演员'
            && document.querySelectorAll('[data-actor-card-id]').length === 3
            && imageAvatars >= 1
            && placeholders >= 1;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "未成功进入 Actors 页面，或头像 / 占位策略不符合预期。",
    );

    return "已进入 Actors 页面，并同时展示真实头像与占位头像";
  });
  environment.checks.push(actorsRoute);
  logCheckResult(actorsRoute);
  if (!actorsRoute.passed) return false;

  const filterSort = await captureCheck("演员筛选与排序", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const keyword = document.querySelector('[data-actors-query-field="keyword"]');
          const apply = document.querySelector('[data-action="apply-actors-query"]');
          if (!(keyword instanceof HTMLInputElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到演员筛选控件。");
          }

          keyword.value = 'Beta';
          keyword.dispatchEvent(new Event('input', { bubbles: true }));
          apply.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const cards = Array.from(document.querySelectorAll('[data-actor-card-id]'));
          return cards.length === 1 && cards[0]?.textContent?.includes('Actor Beta');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "按关键字筛选后未只保留 Actor Beta。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const reset = document.querySelector('[data-action="reset-actors-query"]');
          const sortBy = document.querySelector('[data-actors-query-field="sortBy"]');
          const sortOrder = document.querySelector('[data-actors-query-field="sortOrder"]');
          const apply = document.querySelector('[data-action="apply-actors-query"]');
          if (!(reset instanceof HTMLElement) || !(sortBy instanceof HTMLSelectElement) || !(sortOrder instanceof HTMLSelectElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到演员排序控件。");
          }

          reset.click();
          sortBy.value = 'videoCount';
          sortBy.dispatchEvent(new Event('change', { bubbles: true }));
          sortOrder.value = 'desc';
          sortOrder.dispatchEvent(new Event('change', { bubbles: true }));
          apply.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const first = document.querySelector('[data-actor-card-id]');
          return first?.textContent?.includes('Actor Alpha') ?? false;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "按作品数降序排序后，Actor Alpha 未排在第一位。",
    );

    return "已验证演员关键字筛选和作品数降序排序";
  });
  environment.checks.push(filterSort);
  logCheckResult(filterSort);
  if (!filterSort.passed) return false;

  const paginationAndExtendedSort = await captureCheck("演员分页与扩展排序", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const reset = document.querySelector('[data-action="reset-actors-query"]');
          const sortBy = document.querySelector('[data-actors-query-field="sortBy"]');
          const sortOrder = document.querySelector('[data-actors-query-field="sortOrder"]');
          const pageSize = document.querySelector('[data-actors-query-field="pageSize"]');
          const apply = document.querySelector('[data-action="apply-actors-query"]');
          if (!(reset instanceof HTMLElement) || !(sortBy instanceof HTMLSelectElement) || !(sortOrder instanceof HTMLSelectElement) || !(pageSize instanceof HTMLSelectElement) || !(apply instanceof HTMLElement)) {
            throw new Error("未找到演员分页或扩展排序控件。");
          }

          reset.click();
          sortBy.value = 'actorId';
          sortBy.dispatchEvent(new Event('change', { bubbles: true }));
          sortOrder.value = 'desc';
          sortOrder.dispatchEvent(new Event('change', { bubbles: true }));
          pageSize.value = '1';
          pageSize.dispatchEvent(new Event('change', { bubbles: true }));
          apply.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const first = document.querySelector('[data-actor-card-id]');
          const summary = document.querySelector('[data-actors-page-summary]')?.textContent ?? '';
          return first?.textContent?.includes('Actor Gamma') === true
            && location.hash.includes('sortBy=actorId')
            && location.hash.includes('pageSize=1')
            && summary.includes('第 1 / 3 页');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "演员扩展排序或第一页分页状态不符合预期。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const next = document.querySelector('[data-action="actors-next-page"]');
          if (!(next instanceof HTMLElement)) {
            throw new Error("未找到演员下一页按钮。");
          }

          next.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const first = document.querySelector('[data-actor-card-id]');
          const summary = document.querySelector('[data-actors-page-summary]')?.textContent ?? '';
          return location.hash.includes('pageIndex=1')
            && first?.textContent?.includes('Actor Beta') === true
            && summary.includes('第 2 / 3 页');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "切到演员第二页后结果或页码摘要不正确。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const previous = document.querySelector('[data-action="actors-previous-page"]');
          if (!(previous instanceof HTMLElement)) {
            throw new Error("未找到演员上一页按钮。");
          }

          previous.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const first = document.querySelector('[data-actor-card-id]');
          return !location.hash.includes('pageIndex=1')
            && first?.textContent?.includes('Actor Gamma') === true;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "返回演员第一页后结果未恢复。",
    );

    return "已验证 actorId 扩展排序、pageSize=1 和前后翻页";
  });
  environment.checks.push(paginationAndExtendedSort);
  logCheckResult(paginationAndExtendedSort);
  if (!paginationAndExtendedSort.passed) return false;

  const actorDetailRoute = await captureCheck("演员详情页与影片返回链路", async () => {
    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const reset = document.querySelector('[data-action="reset-actors-query"]');
          if (!(reset instanceof HTMLElement)) {
            throw new Error("未找到演员重置按钮。");
          }

          reset.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const cards = Array.from(document.querySelectorAll('[data-actor-card-id]'));
          return cards.length === 3 && cards.some((item) => item.textContent?.includes('Actor Alpha'));
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "重置演员查询后未恢复完整结果集。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const link = Array.from(document.querySelectorAll('[data-actor-card-id] a.ghost-link'))
            .find((item) => item.textContent?.includes('查看详情') && item.closest('[data-actor-card-id]')?.textContent?.includes('Actor Alpha'));
          if (!(link instanceof HTMLAnchorElement)) {
            throw new Error("未找到 Actor Alpha 的详情入口。");
          }

          link.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const detailName = document.querySelector('[data-actor-detail-name]')?.textContent?.trim() ?? '';
          const relatedVideos = document.querySelectorAll('[data-actor-video-id]').length;
          const sourceLink = Array.from(document.querySelectorAll('.surface-card a.ghost-link'))
            .find((item) => item.textContent?.includes('MetaTube'));
          return location.hash.startsWith('#/actors/')
            && detailName === 'Actor Alpha'
            && relatedVideos === 2
            && (document.body.innerText ?? '').includes('Actors 列表')
            && sourceLink instanceof HTMLAnchorElement
            && sourceLink.href === 'https://actors.example/alpha';
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "演员详情页未正确展示头部信息或关联影片。",
    );

    const snapshot = await executeInRenderer<{
      detailName: string;
      hash: string;
      relatedVideos: number;
    }>(
      mainWindow,
      `
        (() => ({
          detailName: document.querySelector('[data-actor-detail-name]')?.textContent?.trim() ?? '',
          hash: location.hash,
          relatedVideos: document.querySelectorAll('[data-actor-video-id]').length,
        }))()
      `,
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const link = document.querySelector('[data-actor-video-id] .video-result-title');
          if (!(link instanceof HTMLAnchorElement)) {
            throw new Error("未找到演员详情页中的关联影片入口。");
          }

          link.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const header = document.querySelector('.content-header h1')?.textContent?.trim() ?? '';
          const actorBackButton = document.querySelector('[data-action="navigate-back-to"]');
          return location.hash.startsWith('#/videos/')
            && location.hash.includes('backTo=')
            && header.length > 0
            && actorBackButton instanceof HTMLElement
            && actorBackButton.textContent?.includes('返回演员');
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "从演员详情进入影片详情后，返回演员链路未建立。",
    );

    await executeInRenderer(
      mainWindow,
      `
        (() => {
          const button = document.querySelector('[data-action="navigate-back-to"]');
          if (!(button instanceof HTMLElement)) {
            throw new Error("未找到影片详情页的返回演员按钮。");
          }

          button.click();
        })()
      `,
    );

    await waitForCondition(
      mainWindow,
      `
        (() => {
          const detailName = document.querySelector('[data-actor-detail-name]')?.textContent?.trim() ?? '';
          return location.hash.startsWith('#/actors/')
            && detailName === 'Actor Alpha'
            && document.querySelectorAll('[data-actor-video-id]').length === 2;
        })()
      `,
      RENDERER_WAIT_TIMEOUT_MS,
      "从影片详情返回演员详情后，页面未恢复。",
    );

    return `detail=${snapshot.detailName}, videos=${snapshot.relatedVideos}, hash=${snapshot.hash}`;
  });
  environment.checks.push(actorDetailRoute);
  logCheckResult(actorDetailRoute);
  return actorDetailRoute.passed;
}

async function seedActorRows(appBaseDir: string, libraryId: string): Promise<void> {
  const databasePath = path.join(appBaseDir, "data", os.userInfo().username, "app_datas.sqlite");
  const database = new DatabaseSync(databasePath);

  try {
    const rows = database.prepare(`
      SELECT metadata.DataID AS dataId, metadata_video.VID AS vid
      FROM metadata
      INNER JOIN metadata_video ON metadata_video.DataID = metadata.DataID
      WHERE metadata.DBId = ?
      ORDER BY metadata.DataID ASC;
    `).all(Number.parseInt(libraryId, 10)) as Array<{ dataId: number; vid: string; }>;

    if (rows.length < 3) {
      throw new Error(`演员回归造数失败，库 ${libraryId} 仅找到 ${rows.length} 个影片。`);
    }

    const byVid = new Map(rows.map((row) => [row.vid, row.dataId]));
    const abpId = byVid.get("ABP-123");
    const jurId = byVid.get("JUR-293-C");
    const ipxId = byVid.get("IPX-001");
    if (!abpId || !jurId || !ipxId) {
      throw new Error(`演员回归造数失败，未找到 ABP-123/JUR-293-C/IPX-001，实际=${JSON.stringify(rows)}`);
    }

    database.exec("BEGIN;");
    try {
      database.exec("DELETE FROM metadata_to_actor;");
      database.exec("DELETE FROM actor_info;");

      const insertActor = database.prepare("INSERT INTO actor_info (ActorName, WebType, WebUrl) VALUES (?, ?, ?);");
      const alphaResult = insertActor.run("Actor Alpha", "MetaTube", "https://actors.example/alpha");
      const betaResult = insertActor.run("Actor Beta", "Archive", "https://actors.example/beta");
      const gammaResult = insertActor.run("Actor Gamma", "Local", "https://actors.example/gamma");
      const insertMapping = database.prepare("INSERT OR IGNORE INTO metadata_to_actor (ActorID, DataID) VALUES (?, ?);");

      insertMapping.run(Number(alphaResult.lastInsertRowid), abpId);
      insertMapping.run(Number(alphaResult.lastInsertRowid), jurId);
      insertMapping.run(Number(betaResult.lastInsertRowid), jurId);
      insertMapping.run(Number(gammaResult.lastInsertRowid), ipxId);
      database.exec("COMMIT;");

      const avatarDirectory = path.join(appBaseDir, "data", os.userInfo().username, "cache", "actor-avatar");
      fs.mkdirSync(avatarDirectory, { recursive: true });
      fs.writeFileSync(
        path.join(avatarDirectory, `${Number(alphaResult.lastInsertRowid)}.png`),
        Buffer.from(SAMPLE_AVATAR_PNG_BASE64, "base64"),
      );
    } catch (error) {
      database.exec("ROLLBACK;");
      throw error;
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

async function navigateToActors(mainWindow: BrowserWindow): Promise<void> {
  await executeInRenderer(
    mainWindow,
    `
      (() => {
        const link = Array.from(document.querySelectorAll('.primary-nav .nav-link'))
          .find((item) => item.textContent?.includes('Actors'));
        if (!(link instanceof HTMLElement)) {
          throw new Error("未找到 Actors 导航入口。");
        }

        link.click();
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

  throw new Error("Unable to locate Jvedio release app base directory.");
}

async function executeInRenderer<T>(mainWindow: BrowserWindow, expression: string): Promise<T> {
  return mainWindow.webContents.executeJavaScript(expression, true) as Promise<T>;
}

async function waitForCondition(
  mainWindow: BrowserWindow,
  expression: string,
  timeoutMs: number,
  failureMessage: string,
): Promise<void> {
  const start = Date.now();
  while (Date.now() - start <= timeoutMs) {
    const result = await executeInRenderer<unknown>(mainWindow, expression);
    if (result) {
      return;
    }

    await delay(250);
  }

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
  throw new Error(`${failureMessage} 快照=${JSON.stringify(snapshot)}`);
}

async function captureCheck(name: string, action: () => Promise<string>): Promise<ActorsRegressionCheckResult> {
  try {
    const details = await action();
    return { details, issue: null, name, passed: true };
  } catch (error) {
    return {
      details: "",
      issue: error instanceof Error ? error.stack ?? error.message : String(error),
      name,
      passed: false,
    };
  }
}

function logCheckResult(result: ActorsRegressionCheckResult): void {
  const prefix = result.passed ? "[Actors-Regression][PASS]" : "[Actors-Regression][FAIL]";
  console.log(prefix, result.name, result.passed ? result.details : result.issue ?? "Unknown issue");
}

function delay(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, timeoutMs);
  });
}
