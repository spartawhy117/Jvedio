use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;

use serde::Serialize;
use tauri::{AppHandle, Emitter, Manager};

/// Prefix emitted by Jvedio.Worker on stdout when ready.
const READY_SIGNAL_PREFIX: &str = "JVEDIO_WORKER_READY";

/// Tauri event names emitted to the renderer.
const EVENT_WORKER_READY: &str = "worker-ready";
const EVENT_WORKER_ERROR: &str = "worker-error";
const EVENT_WORKER_LOG: &str = "worker-log";

// ── Payloads ────────────────────────────────────────────

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerReadyPayload {
    pub base_url: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerErrorPayload {
    pub message: String,
    pub phase: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkerLogPayload {
    pub line: String,
}

// ── State ───────────────────────────────────────────────

pub struct WorkerState {
    child: Mutex<Option<Child>>,
    base_url: Mutex<Option<String>>,
}

impl WorkerState {
    pub fn new() -> Self {
        Self {
            child: Mutex::new(None),
            base_url: Mutex::new(None),
        }
    }
}

// ── Tauri commands ──────────────────────────────────────

/// Return the Worker base URL if already ready, otherwise `null`.
#[tauri::command]
pub fn get_worker_base_url(state: tauri::State<'_, WorkerState>) -> Option<String> {
    state.base_url.lock().unwrap().clone()
}

// ── Lifecycle ───────────────────────────────────────────

/// Resolve the path to `Jvedio.Worker.exe`.
///
/// Strategy (dev vs. bundled):
/// - In dev mode (`cfg(debug_assertions)`) we look for the pre-built Worker
///   at the well-known Release output path relative to the workspace.
/// - In release / bundled mode we expect the Worker to sit next to the shell
///   executable inside a `worker/` subdirectory.
fn resolve_worker_path() -> PathBuf {
    if cfg!(debug_assertions) {
        // Dev: workspace-relative path
        let workspace_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
            .parent() // src-tauri -> tauri
            .and_then(|p| p.parent()) // tauri -> repo root
            .expect("cannot resolve workspace root")
            .to_path_buf();
        workspace_root
            .join("Jvedio-WPF")
            .join("Jvedio.Worker")
            .join("bin")
            .join("Release")
            .join("net8.0")
            .join("Jvedio.Worker.exe")
    } else {
        // Bundled: next to the shell exe in a `worker` folder
        let exe_dir = std::env::current_exe()
            .expect("cannot resolve current exe path")
            .parent()
            .expect("exe has no parent dir")
            .to_path_buf();
        exe_dir.join("worker").join("Jvedio.Worker.exe")
    }
}

/// Spawn `Jvedio.Worker` as a child process, monitor its stdout for the
/// ready signal, and emit Tauri events to the renderer.
pub fn spawn_worker(app: &AppHandle) {
    let worker_path = resolve_worker_path();

    if !worker_path.exists() {
        let msg = format!(
            "Worker executable not found at: {}",
            worker_path.display()
        );
        eprintln!("[jvedio-shell] {msg}");
        let _ = app.emit(
            EVENT_WORKER_ERROR,
            WorkerErrorPayload {
                message: msg,
                phase: "resolve".into(),
            },
        );
        return;
    }

    println!(
        "[jvedio-shell] spawning Worker: {}",
        worker_path.display()
    );

    let child_result = Command::new(&worker_path)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn();

    let mut child = match child_result {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("Failed to spawn Worker: {e}");
            eprintln!("[jvedio-shell] {msg}");
            let _ = app.emit(
                EVENT_WORKER_ERROR,
                WorkerErrorPayload {
                    message: msg,
                    phase: "spawn".into(),
                },
            );
            return;
        }
    };

    // Take ownership of stdout / stderr pipes.
    let stdout = child
        .stdout
        .take()
        .expect("child stdout was not captured");
    let stderr = child
        .stderr
        .take()
        .expect("child stderr was not captured");

    // Store the child handle so we can kill it on app exit.
    {
        let state = app.state::<WorkerState>();
        *state.child.lock().unwrap() = Some(child);
    }

    // ── stdout reader thread ────────────────────────────
    let app_stdout = app.clone();
    thread::Builder::new()
        .name("worker-stdout".into())
        .spawn(move || {
            let reader = BufReader::new(stdout);
            for line in reader.lines() {
                match line {
                    Ok(text) => {
                        println!("[Worker:stdout] {text}");

                        // Check for ready signal
                        if text.starts_with(READY_SIGNAL_PREFIX) {
                            let base_url = text
                                .strip_prefix(READY_SIGNAL_PREFIX)
                                .unwrap_or("")
                                .trim()
                                .to_string();

                            if !base_url.is_empty() {
                                println!(
                                    "[jvedio-shell] Worker ready at {base_url}"
                                );

                                // Store base_url in state
                                {
                                    let state =
                                        app_stdout.state::<WorkerState>();
                                    *state.base_url.lock().unwrap() =
                                        Some(base_url.clone());
                                }

                                let _ = app_stdout.emit(
                                    EVENT_WORKER_READY,
                                    WorkerReadyPayload { base_url },
                                );
                            }
                        }

                        // Forward all stdout lines as log events
                        let _ = app_stdout.emit(
                            EVENT_WORKER_LOG,
                            WorkerLogPayload { line: text },
                        );
                    }
                    Err(e) => {
                        eprintln!(
                            "[jvedio-shell] Worker stdout read error: {e}"
                        );
                        break;
                    }
                }
            }

            // stdout closed → Worker process ended
            eprintln!("[jvedio-shell] Worker stdout stream closed");
            let _ = app_stdout.emit(
                EVENT_WORKER_ERROR,
                WorkerErrorPayload {
                    message: "Worker process exited unexpectedly".into(),
                    phase: "runtime".into(),
                },
            );
        })
        .expect("failed to spawn worker-stdout thread");

    // ── stderr reader thread ────────────────────────────
    let app_stderr = app.clone();
    thread::Builder::new()
        .name("worker-stderr".into())
        .spawn(move || {
            let reader = BufReader::new(stderr);
            for line in reader.lines() {
                match line {
                    Ok(text) => {
                        eprintln!("[Worker:stderr] {text}");
                        let _ = app_stderr.emit(
                            EVENT_WORKER_LOG,
                            WorkerLogPayload { line: text },
                        );
                    }
                    Err(_) => break,
                }
            }
        })
        .expect("failed to spawn worker-stderr thread");
}

/// Kill the Worker child process (called on app exit).
pub fn kill_worker(app: &AppHandle) {
    let state = app.state::<WorkerState>();
    let mut guard = state.child.lock().unwrap();
    if let Some(ref mut child) = *guard {
        println!("[jvedio-shell] killing Worker child process");
        let _ = child.kill();
        let _ = child.wait();
    }
    drop(guard);
}
