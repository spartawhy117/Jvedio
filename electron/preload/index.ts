import { contextBridge } from "electron";

import { createAppBridge } from "./bridge/appBridge";
import { createWorkerBridge } from "./bridge/workerBridge";

contextBridge.exposeInMainWorld("jvedioApp", createAppBridge());
contextBridge.exposeInMainWorld("jvedioWorker", createWorkerBridge());
