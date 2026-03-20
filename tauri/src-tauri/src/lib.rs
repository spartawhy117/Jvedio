mod shell_log;
mod worker;

use tauri::Manager;
use worker::{spawn_worker, kill_worker, WorkerState};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Reset (truncate) today's shell log file — overwrite-per-run semantics
    shell_log::reset_shell_log();
    shell_log::shell_log("[jvedio-shell] ====== Shell starting ======");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            // When a second instance is launched, focus the existing main window.
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .manage(WorkerState::new())
        .invoke_handler(tauri::generate_handler![worker::get_worker_base_url])
        .setup(|app| {
            // Spawn Jvedio.Worker as a child process on app startup.
            spawn_worker(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            // Kill Worker when the main window is about to close.
            if let tauri::WindowEvent::Destroyed = event {
                kill_worker(window.app_handle());
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running Jvedio shell");
}
