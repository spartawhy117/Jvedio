import { BrowserWindow } from "electron";
import path from "node:path";

import { getWindowState } from "../shell/windowState";

export async function createMainWindow(electronRoot: string): Promise<BrowserWindow> {
  const windowState = getWindowState();
  const preloadPath = path.join(electronRoot, "dist", "preload", "index.js");
  const htmlPath = path.join(electronRoot, "renderer", "index.html");

  const mainWindow = new BrowserWindow({
    width: windowState.width,
    height: windowState.height,
    minWidth: 1200,
    minHeight: 720,
    show: false,
    backgroundColor: "#0f1115",
    title: "Jvedio Home MVP Shell",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.once("ready-to-show", () => {
    mainWindow.show();
  });

  await mainWindow.loadFile(htmlPath);
  return mainWindow;
}
