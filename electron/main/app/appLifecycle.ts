import { app } from "electron";

import type { WorkerProcessController } from "../worker/workerProcess";

export function registerAppLifecycle(workerController: WorkerProcessController): void {
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });

  app.on("before-quit", () => {
    void workerController.stop();
  });
}
