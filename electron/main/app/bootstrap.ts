import { app, ipcMain } from "electron";
import path from "node:path";

import { registerAppLifecycle } from "./appLifecycle";
import { createMainWindow } from "./createMainWindow";
import { configureTray } from "../shell/tray";
import { WorkerProcessController } from "../worker/workerProcess";

async function bootstrap(): Promise<void> {
  const electronRoot = path.resolve(__dirname, "../../..");
  const workerController = new WorkerProcessController(electronRoot);

  registerAppLifecycle(workerController);
  await app.whenReady();

  const workerBaseUrl = await workerController.start();
  ipcMain.handle("app:getVersion", () => app.getVersion());
  ipcMain.handle("worker:getBaseUrl", () => workerBaseUrl);

  configureTray();
  await createMainWindow(electronRoot);

  if (process.argv.includes("--smoke")) {
    setTimeout(() => {
      app.quit();
    }, 2000);
  }
}

bootstrap().catch((error: unknown) => {
  console.error("[Electron-HomeMvp] Failed to bootstrap shell", error);
  app.exit(1);
});
