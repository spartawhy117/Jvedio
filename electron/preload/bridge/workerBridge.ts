import { ipcRenderer } from "electron";

export interface WorkerBridge {
  getWorkerBaseUrl(): Promise<string>;
}

export function createWorkerBridge(): WorkerBridge {
  return {
    async getWorkerBaseUrl(): Promise<string> {
      return ipcRenderer.invoke("worker:getBaseUrl");
    }
  };
}
