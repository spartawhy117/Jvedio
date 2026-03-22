mod shell_log;
mod worker;

use std::sync::Mutex;

use tauri::{AppHandle, Manager, WebviewWindow};
use worker::{kill_worker, spawn_worker, WorkerState};

use crate::shell_log::shell_log;

struct StartupWindowState {
    main_window_revealed: Mutex<bool>,
}

impl StartupWindowState {
    fn new() -> Self {
        Self {
            main_window_revealed: Mutex::new(false),
        }
    }
}

fn focus_window(window: &WebviewWindow) {
    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
}

fn reveal_main_window(app: &AppHandle, reason: &str) -> Result<(), String> {
    let state = app.state::<StartupWindowState>();
    let mut revealed = state.main_window_revealed.lock().unwrap();

    if *revealed {
        shell_log(&format!(
            "[jvedio-shell] main window already revealed, ignoring duplicate reveal ({reason})"
        ));
        return Ok(());
    }

    let main = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window not found".to_string())?;

    if let Some(splash) = app.get_webview_window("splashscreen") {
        let _ = splash.close();
    }

    main.show()
        .map_err(|e| format!("Failed to show main window: {e}"))?;
    let _ = main.unminimize();
    main.set_focus()
        .map_err(|e| format!("Failed to focus main window: {e}"))?;

    *revealed = true;
    shell_log(&format!(
        "[jvedio-shell] main window revealed ({reason})"
    ));

    Ok(())
}

#[tauri::command]
fn mark_main_window_ready(app: AppHandle) -> Result<(), String> {
    reveal_main_window(&app, "ready")
}

#[tauri::command]
fn reveal_main_window_for_error(app: AppHandle) -> Result<(), String> {
    reveal_main_window(&app, "error")
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Reset (truncate) today's shell log file — overwrite-per-run semantics
    shell_log::reset_shell_log();
    shell_log::shell_log("[jvedio-shell] ====== Shell starting ======");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            let startup_state = app.state::<StartupWindowState>();
            let main_revealed = *startup_state.main_window_revealed.lock().unwrap();

            if main_revealed {
                if let Some(window) = app.get_webview_window("main") {
                    focus_window(&window);
                    return;
                }
            }

            if let Some(window) = app.get_webview_window("splashscreen") {
                focus_window(&window);
                return;
            }

            if let Some(window) = app.get_webview_window("main") {
                focus_window(&window);
            }
        }))
        .manage(WorkerState::new())
        .manage(StartupWindowState::new())
        .invoke_handler(tauri::generate_handler![
            worker::get_worker_base_url,
            worker::get_runtime_metrics,
            mark_main_window_ready,
            reveal_main_window_for_error
        ])
        .setup(|app| {
            // Spawn Jvedio.Worker as a child process on app startup.
            spawn_worker(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Kill Worker when the main window is about to close.
            if window.label() == "main" {
                if let tauri::WindowEvent::Destroyed = event {
                    kill_worker(window.app_handle());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Jvedio shell");
}
