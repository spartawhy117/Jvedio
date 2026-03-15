import { spawn, type ChildProcessByStdio } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import type { Readable } from "node:stream";

import { waitForWorkerHealth } from "./workerHealth";

const READY_SIGNAL_PREFIX = "JVEDIO_WORKER_READY";
const WORKER_START_TIMEOUT_MS = 20000;

export class WorkerProcessController {
  private readonly electronRoot: string;
  private readonly sharedAppBaseDir: string;
  private readonly workerProjectDirectory: string;
  private baseUrl = "";
  private childProcess: WorkerChildProcess | null = null;

  public constructor(electronRoot: string) {
    this.electronRoot = electronRoot;
    this.sharedAppBaseDir = resolveSharedAppBaseDir(electronRoot);
    this.workerProjectDirectory = path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio.Worker");
  }

  public async start(): Promise<string> {
    if (this.childProcess && this.baseUrl) {
      return this.baseUrl;
    }

    const port = await getAvailablePort();
    const baseUrl = `http://127.0.0.1:${port}`;
    const workerDllPath = resolveWorkerDllPath(this.electronRoot);

    const childProcess = spawn("dotnet", [workerDllPath, "--urls", baseUrl], {
      cwd: this.workerProjectDirectory,
      env: {
        ...process.env,
        JVEDIO_APP_BASE_DIR: this.sharedAppBaseDir
      },
      stdio: ["ignore", "pipe", "pipe"]
    });

    childProcess.stderr.on("data", (chunk: Buffer) => {
      console.error("[Electron-HomeMvp] Worker stderr", chunk.toString().trim());
    });

    this.childProcess = childProcess;

    const readyBaseUrl = await waitForReadySignal(childProcess, baseUrl);
    await waitForWorkerHealth(readyBaseUrl, WORKER_START_TIMEOUT_MS);

    this.baseUrl = readyBaseUrl;
    console.log("[Electron-HomeMvp] Worker started at", readyBaseUrl);
    return readyBaseUrl;
  }

  public async stop(): Promise<void> {
    if (!this.childProcess) {
      return;
    }

    const currentProcess = this.childProcess;
    this.childProcess = null;
    this.baseUrl = "";

    if (!currentProcess.killed) {
      currentProcess.kill();
    }
  }
}

function resolveWorkerDllPath(electronRoot: string): string {
  const overridePath = process.env.JVEDIO_WORKER_DLL;
  if (overridePath && fs.existsSync(overridePath)) {
    return overridePath;
  }

  const candidates = [
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio.Worker", "bin", "Release", "net8.0", "Jvedio.Worker.dll"),
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio.Worker", "bin", "Debug", "net8.0", "Jvedio.Worker.dll")
  ];

  const existingCandidate = candidates.find((candidate) => fs.existsSync(candidate));
  if (existingCandidate) {
    return existingCandidate;
  }

  throw new Error("Jvedio.Worker.dll was not found. Build Jvedio.Worker before starting Electron.");
}

function resolveSharedAppBaseDir(electronRoot: string): string {
  const overridePath = process.env.JVEDIO_APP_BASE_DIR;
  if (overridePath && fs.existsSync(path.join(overridePath, "Jvedio.exe"))) {
    return overridePath;
  }

  const candidates = [
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio", "bin", "Release"),
    path.join(electronRoot, "..", "Jvedio-WPF", "Jvedio", "bin", "Debug")
  ];

  const existingCandidate = candidates.find((candidate) => fs.existsSync(path.join(candidate, "Jvedio.exe")));
  if (existingCandidate) {
    return existingCandidate;
  }

  throw new Error("Jvedio.exe was not found. Build the WPF app before starting Electron.");
}

async function getAvailablePort(): Promise<number> {
  return new Promise<number>((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Failed to allocate a worker port."));
        return;
      }

      const port = address.port;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(port);
      });
    });
  });
}

async function waitForReadySignal(
  childProcess: WorkerChildProcess,
  expectedBaseUrl: string
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const timeoutHandle = setTimeout(() => {
      if (settled) {
        return;
      }

      settled = true;
      reject(new Error(`Timed out waiting for worker ready signal: ${expectedBaseUrl}`));
    }, WORKER_START_TIMEOUT_MS);

    childProcess.stdout.on("data", (chunk: Buffer) => {
      const lines = chunk
        .toString()
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      for (const line of lines) {
        console.log("[Electron-HomeMvp] Worker stdout", line);
        if (!line.startsWith(READY_SIGNAL_PREFIX)) {
          continue;
        }

        if (settled) {
          return;
        }

        settled = true;
        clearTimeout(timeoutHandle);
        const readyBaseUrl = line.substring(READY_SIGNAL_PREFIX.length).trim();
        resolve(readyBaseUrl || expectedBaseUrl);
      }
    });

    childProcess.once("exit", (code, signal) => {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timeoutHandle);
      reject(new Error(`Worker exited before ready. code=${code ?? "null"} signal=${signal ?? "null"}`));
    });
  });
}

type WorkerChildProcess = ChildProcessByStdio<null, Readable, Readable>;
