import { ipcRenderer } from "electron";

export interface AppBridge {
  getAppVersion(): Promise<string>;
}

export function createAppBridge(): AppBridge {
  return {
    async getAppVersion(): Promise<string> {
      return ipcRenderer.invoke("app:getVersion");
    }
  };
}
