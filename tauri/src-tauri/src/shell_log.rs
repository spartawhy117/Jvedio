use std::fs::{self, OpenOptions};
use std::io::Write;
use std::path::PathBuf;
use std::sync::Mutex;

use chrono::Local;

/// Global log file handle (lazy initialized).
static LOG_FILE: Mutex<Option<(String, PathBuf)>> = Mutex::new(None);

/// Resolve the unified log directory.
///
/// Dev:  `{repo}/log/`  (CARGO_MANIFEST_DIR → src-tauri → tauri → repo)
/// Prod: `{exe-dir}/log/`
fn resolve_log_dir() -> PathBuf {
    // Environment variable override
    if let Ok(dir) = std::env::var("JVEDIO_LOG_DIR") {
        if !dir.is_empty() {
            return PathBuf::from(dir);
        }
    }

    // Dev mode: CARGO_MANIFEST_DIR is set at compile time
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    if let Some(repo_root) = manifest_dir.parent().and_then(|p| p.parent()) {
        let candidate = repo_root.join("log");
        // Verify this looks like the repo root
        if repo_root.join("Jvedio-WPF").exists() || repo_root.join("tauri").exists() {
            return candidate;
        }
    }

    // Prod fallback: next to exe
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(|pp| pp.to_path_buf()))
        .unwrap_or_else(|| PathBuf::from("."));
    exe_dir.join("log")
}

/// Write a line to the shell log file.
///
/// Log file: `{log_dir}/shell-{YYYY-MM-DD}.log`
/// Each run overwrites the file (first write truncates, subsequent appends).
pub fn shell_log(msg: &str) {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let timestamp = Local::now().format("%H:%M:%S%.3f").to_string();
    let line = format!("{timestamp} {msg}\n");

    let log_dir = resolve_log_dir();
    let _ = fs::create_dir_all(&log_dir);
    let log_path = log_dir.join(format!("shell-{today}.log"));

    // Append to today's file
    if let Ok(mut file) = OpenOptions::new()
        .create(true)
        .append(true)
        .open(&log_path)
    {
        let _ = file.write_all(line.as_bytes());
    }
}

/// Clear today's shell log file (call once at startup for overwrite-per-run semantics).
pub fn reset_shell_log() {
    let today = Local::now().format("%Y-%m-%d").to_string();
    let log_dir = resolve_log_dir();
    let _ = fs::create_dir_all(&log_dir);
    let log_path = log_dir.join(format!("shell-{today}.log"));

    // Truncate the file
    if let Ok(file) = OpenOptions::new()
        .create(true)
        .write(true)
        .truncate(true)
        .open(&log_path)
    {
        drop(file);
    }

    // Also clean up log files older than 10 days
    clean_old_logs(&log_dir, "shell-", 10);
}

/// Remove log files matching `{prefix}*.log` older than `keep_days`.
fn clean_old_logs(log_dir: &PathBuf, prefix: &str, keep_days: i64) {
    let cutoff = Local::now() - chrono::Duration::days(keep_days);
    let cutoff_str = cutoff.format("%Y-%m-%d").to_string();

    if let Ok(entries) = fs::read_dir(log_dir) {
        for entry in entries.flatten() {
            let name = entry.file_name().to_string_lossy().to_string();
            if name.starts_with(prefix) && name.ends_with(".log") {
                // Extract date from filename: "shell-2026-03-19.log" → "2026-03-19"
                let date_part = name
                    .strip_prefix(prefix)
                    .and_then(|s| s.strip_suffix(".log"))
                    .unwrap_or("");
                if !date_part.is_empty() && date_part < cutoff_str.as_str() {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
    }
}
