import { app, ipcMain } from "electron";
import path from "node:path";

import { registerAppLifecycle } from "./appLifecycle";
import { createMainWindow } from "./createMainWindow";
import { configureTray } from "../shell/tray";
import { prepareC3RegressionEnvironment, runC3Regression } from "../testing/c3Regression";
import { WorkerProcessController } from "../worker/workerProcess";

async function bootstrap(): Promise<void> {
  const electronRoot = path.resolve(__dirname, "../../..");
  const c3RegressionEnvironment = await prepareC3RegressionEnvironment(electronRoot);
  const workerController = new WorkerProcessController(electronRoot);

  registerAppLifecycle(workerController);
  await app.whenReady();

  const workerBaseUrl = await workerController.start();
  ipcMain.handle("app:getVersion", () => app.getVersion());
  ipcMain.handle("worker:getBaseUrl", () => workerBaseUrl);

  configureTray();
  const mainWindow = await createMainWindow(electronRoot);

  if (c3RegressionEnvironment) {
    const success = await runC3Regression(mainWindow, c3RegressionEnvironment);
    await workerController.stop();
    app.exit(success ? 0 : 1);
    return;
  }

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
