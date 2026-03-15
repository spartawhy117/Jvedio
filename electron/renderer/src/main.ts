interface AppBridge {
  getAppVersion(): Promise<string>;
}

interface WorkerBridge {
  getWorkerBaseUrl(): Promise<string>;
}

export {};

declare global {
  interface Window {
    jvedioApp: AppBridge;
    jvedioWorker: WorkerBridge;
  }
}

async function bootstrap(): Promise<void> {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    throw new Error("Renderer root element was not found.");
  }

  const [appVersion, workerBaseUrl] = await Promise.all([
    window.jvedioApp.getAppVersion(),
    window.jvedioWorker.getWorkerBaseUrl()
  ]);

  const health = await fetch(`${workerBaseUrl}/health/ready`).then((response) =>
    response.json() as Promise<{
      data?: {
        status?: string;
      };
    }>,
  );

  const workerStatus = health.data?.status ?? "unknown";
  const statusClass = workerStatus === "ready" ? "status-ok" : "status-error";

  appRoot.innerHTML = `
    <main class="shell">
      <aside class="sidebar">
        <div class="brand">Jvedio</div>
        <div class="brand-subtitle">Electron Home MVP shell scaffold</div>
      </aside>
      <section class="content">
        <div class="panel">
          <span class="eyebrow">Stage C-1</span>
          <h1>Shell and worker skeleton is wired.</h1>
          <p>
            This page is only the bootstrap milestone for the new shell. Home data,
            library CRUD, navigation sync, and structured errors will be implemented
            in the following C-2 to C-4 stages.
          </p>
          <dl>
            <dt>App version</dt>
            <dd>${escapeHtml(appVersion)}</dd>
            <dt>Worker base URL</dt>
            <dd>${escapeHtml(workerBaseUrl)}</dd>
            <dt>Worker status</dt>
            <dd class="${statusClass}">${escapeHtml(workerStatus)}</dd>
          </dl>
        </div>
      </section>
    </main>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

bootstrap().catch((error: unknown) => {
  const appRoot = document.getElementById("app");
  if (!appRoot) {
    throw error;
  }

  const message = error instanceof Error ? error.message : String(error);
  appRoot.innerHTML = `<pre class="status-error">${escapeHtml(message)}</pre>`;
});
