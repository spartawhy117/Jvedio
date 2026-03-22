use std::collections::{HashSet, VecDeque};
use std::io::{BufRead, BufReader};
use std::path::PathBuf;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::thread;

use serde::Serialize;
use sysinfo::{Pid, System};
use tauri::{AppHandle, Emitter, Manager};

use crate::shell_log::shell_log;

#[cfg(windows)]
use std::os::windows::process::CommandExt;

/// Prefix emitted by Jvedio.Worker on stdout when ready.
const READY_SIGNAL_PREFIX: &str = "JVEDIO_WORKER_READY";
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

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

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct RuntimeMetricsPayload {
    pub worker_running: bool,
    pub shell_cpu_percent: f32,
    pub worker_cpu_percent: f32,
    pub total_cpu_percent: f32,
    pub shell_memory_mb: u64,
    pub worker_memory_mb: u64,
    pub total_memory_mb: u64,
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

#[tauri::command]
pub fn get_runtime_metrics(state: tauri::State<'_, WorkerState>) -> RuntimeMetricsPayload {
    let worker_pid = state.child.lock().unwrap().as_ref().map(|child| child.id());

    let mut system = System::new_all();
    system.refresh_all();
    thread::sleep(sysinfo::MINIMUM_CPU_UPDATE_INTERVAL);
    system.refresh_all();

    let logical_cpu_count = system.cpus().len().max(1) as f32;
    let worker_tree = worker_pid
        .map(|pid| collect_process_tree_pids(&system, pid))
        .unwrap_or_default();
    let shell_metrics = read_process_tree_metrics(
        &system,
        std::process::id(),
        Some(&worker_tree),
        logical_cpu_count,
    );
    let worker_metrics = worker_pid.and_then(|pid| {
        read_process_tree_metrics(&system, pid, None, logical_cpu_count)
    });

    let shell_cpu_percent = shell_metrics.map(|item| item.cpu_percent).unwrap_or(0.0);
    let worker_cpu_percent = worker_metrics.map(|item| item.cpu_percent).unwrap_or(0.0);
    let shell_memory_mb = shell_metrics.map(|item| item.memory_mb).unwrap_or(0);
    let worker_memory_mb = worker_metrics.map(|item| item.memory_mb).unwrap_or(0);

    RuntimeMetricsPayload {
        worker_running: worker_metrics.is_some(),
        shell_cpu_percent,
        worker_cpu_percent,
        total_cpu_percent: normalize_cpu_percent(
            shell_metrics.map(|item| item.raw_cpu_percent).unwrap_or(0.0)
                + worker_metrics.map(|item| item.raw_cpu_percent).unwrap_or(0.0),
            logical_cpu_count,
        ),
        shell_memory_mb,
        worker_memory_mb,
        total_memory_mb: shell_memory_mb + worker_memory_mb,
    }
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
            .join("dotnet")
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
        shell_log(&format!("[jvedio-shell] ERROR {msg}"));
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
    shell_log(&format!("[jvedio-shell] spawning Worker: {}", worker_path.display()));

    let mut command = Command::new(&worker_path);
    command.stdout(Stdio::piped()).stderr(Stdio::piped());

    #[cfg(windows)]
    command.creation_flags(CREATE_NO_WINDOW);

    let child_result = command.spawn();

    let mut child = match child_result {
        Ok(c) => c,
        Err(e) => {
            let msg = format!("Failed to spawn Worker: {e}");
            eprintln!("[jvedio-shell] {msg}");
            shell_log(&format!("[jvedio-shell] ERROR {msg}"));
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
                        shell_log(&format!("[jvedio-shell] ERROR Worker stdout read error: {e}"));
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
                        shell_log(&format!("[Worker:stderr] {text}"));
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
        shell_log("[jvedio-shell] killing Worker child process");
        let _ = child.kill();
        let _ = child.wait();
    }
    drop(guard);
}

#[derive(Clone, Copy)]
struct ProcessMetrics {
    raw_cpu_percent: f32,
    cpu_percent: f32,
    memory_mb: u64,
}

fn collect_process_tree_pids(system: &System, root_pid: u32) -> HashSet<Pid> {
    let root = Pid::from_u32(root_pid);
    if system.process(root).is_none() {
        return HashSet::new();
    }

    let mut visited = HashSet::from([root]);
    let mut queue = VecDeque::from([root]);
    while let Some(parent_pid) = queue.pop_front() {
        for (pid, process) in system.processes() {
            if process.parent() == Some(parent_pid) && visited.insert(*pid) {
                queue.push_back(*pid);
            }
        }
    }

    visited
}

fn normalize_cpu_percent(raw_cpu_percent: f32, logical_cpu_count: f32) -> f32 {
    if logical_cpu_count <= 0.0 {
        return 0.0;
    }

    (raw_cpu_percent / logical_cpu_count).clamp(0.0, 100.0)
}

fn read_process_tree_metrics(
    system: &System,
    root_pid: u32,
    excluded_pids: Option<&HashSet<Pid>>,
    logical_cpu_count: f32,
) -> Option<ProcessMetrics> {
    let tree_pids = collect_process_tree_pids(system, root_pid);
    if tree_pids.is_empty() {
        return None;
    }

    let mut raw_cpu_percent = 0.0;
    let mut memory_mb = 0;
    for pid in tree_pids {
        if excluded_pids.is_some_and(|set| set.contains(&pid)) {
            continue;
        }

        if let Some(process) = system.process(pid) {
            raw_cpu_percent += process.cpu_usage();
            memory_mb += process.memory() / 1024 / 1024;
        }
    }

    Some(ProcessMetrics {
        raw_cpu_percent,
        cpu_percent: normalize_cpu_percent(raw_cpu_percent, logical_cpu_count),
        memory_mb,
    })
}
