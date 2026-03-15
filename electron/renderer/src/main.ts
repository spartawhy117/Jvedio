import { HomePageController } from "./features/home/useHomePageData";

async function bootstrap(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    throw new Error("Renderer root element was not found.");
  }

  const controller = new HomePageController(appRoot);
  await controller.initialize();
}

bootstrap().catch((error: unknown) => {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  appRoot.innerHTML = `<main class="fatal-shell"><div class="fatal-card"><span class="eyebrow">Fatal</span><h1>Home MVP 初始化失败</h1><p>${escapeHtml(message)}</p></div></main>`;
});

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
