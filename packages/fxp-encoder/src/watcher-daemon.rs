//! **vst_observer** — optional file watcher (diagnostic only).
//!
//! - Watches offset map + optional `.fxp` output dirs → runs HARD GATE helper → `pnpm vst:observe <provenance>`.
//! - Does **not** mutate gates, triad, or encoder logic.
//! - Run from repo root or set `ALCHEMIST_MONOREPO_ROOT`. `pnpm` and `node` must be on `PATH`.

use chrono::Utc;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use std::sync::mpsc;
use std::time::{Duration, Instant};

const DEFAULT_DEBOUNCE: Duration = Duration::from_millis(1500);

#[derive(Serialize, Debug)]
struct WatcherLogLine {
    ts: String,
    event: String,
    path: String,
    action: String,
    hard_gate_ok: Option<bool>,
    provenance: String,
    note: Option<String>,
}

fn log_line(line: WatcherLogLine) {
    eprintln!(
        "{}",
        serde_json::to_string(&line).unwrap_or_else(|_| r#"{"event":"watcher_daemon_serialize_error"}"#.to_string())
    );
}

fn find_monorepo_root(start: &Path) -> Option<PathBuf> {
    let mut dir = start.to_path_buf();
    for _ in 0..24 {
        let pj = dir.join("package.json");
        if pj.is_file() {
            if let Ok(raw) = fs::read_to_string(&pj) {
                if raw.contains("\"name\": \"alchemist\"")
                    && raw.contains("\"workspaces\"")
                {
                    return Some(dir);
                }
            }
        }
        let parent = dir.parent()?;
        if parent == dir {
            break;
        }
        dir = parent.to_path_buf();
    }
    None
}

fn resolve_root() -> PathBuf {
    if let Ok(p) = std::env::var("ALCHEMIST_MONOREPO_ROOT") {
        let pb = PathBuf::from(p.trim());
        if pb.is_dir() {
            return pb;
        }
    }
    let cwd = std::env::current_dir().unwrap_or_else(|_| PathBuf::from("."));
    if let Some(r) = find_monorepo_root(&cwd) {
        return r;
    }
    let exe_dir = std::env::current_exe()
        .ok()
        .and_then(|p| p.parent().map(Path::to_path_buf));
    if let Some(d) = exe_dir {
        if let Some(r) = find_monorepo_root(&d) {
            return r;
        }
    }
    cwd
}

fn run_hard_gate(root: &Path) -> bool {
    let script = root.join("scripts").join("validate-offsets-if-sample.mjs");
    if !script.is_file() {
        log_line(WatcherLogLine {
            ts: Utc::now().to_rfc3339(),
            event: "vst_observer_schism".to_string(),
            path: script.display().to_string(),
            action: "missing_validate_script".to_string(),
            hard_gate_ok: Some(false),
            provenance: "watcher-daemon".to_string(),
            note: Some("scripts/validate-offsets-if-sample.mjs not found".to_string()),
        });
        return false;
    }

    let status = Command::new("node")
        .arg(&script)
        .current_dir(root)
        .status();

    let ok = matches!(status, Ok(s) if s.success());
    log_line(WatcherLogLine {
        ts: Utc::now().to_rfc3339(),
        event: if ok {
            "vst_observer_hard_gate".to_string()
        } else {
            "vst_observer_schism".to_string()
        },
        path: script.display().to_string(),
        action: if ok { "passed".to_string() } else { "failed".to_string() },
        hard_gate_ok: Some(ok),
        provenance: "watcher-daemon".to_string(),
        note: None,
    });
    ok
}

fn trigger_ts_observer(root: &Path, provenance: &str) {
    let st = Command::new("pnpm")
        .args(["vst:observe", provenance])
        .current_dir(root)
        .status();

    let ok = matches!(&st, Ok(s) if s.success());
    let note = match &st {
        Ok(s) if !s.success() => Some(format!("nonzero_exit:{s}")),
        Err(e) => Some(e.to_string()),
        _ => None,
    };
    log_line(WatcherLogLine {
        ts: Utc::now().to_rfc3339(),
        event: "vst_observer_triggered_ts".to_string(),
        path: "pnpm vst:observe".to_string(),
        action: if ok {
            "completed".to_string()
        } else {
            "failed_or_nonzero".to_string()
        },
        hard_gate_ok: None,
        provenance: provenance.to_string(),
        note,
    });
}

fn path_matches_trigger(path: &Path, root: &Path, fxp_watch: &Path) -> bool {
    let lossy = path.to_string_lossy();
    if lossy.contains("serum-offset-map.ts") {
        return true;
    }
    if lossy.ends_with(".fxp") {
        if path.starts_with(fxp_watch) {
            return true;
        }
        let web_out = root.join("apps").join("web-app").join("output");
        if path.starts_with(&web_out) {
            return true;
        }
    }
    false
}

fn main() -> Result<(), Box<dyn std::error::Error>> {
    let root = resolve_root();
    let debounce_ms: u64 = std::env::var("ALCHEMIST_VST_WATCH_DEBOUNCE_MS")
        .ok()
        .and_then(|s| s.parse().ok())
        .map(|n: u64| n.max(200))
        .unwrap_or(DEFAULT_DEBOUNCE.as_millis() as u64);
    let debounce = Duration::from_millis(debounce_ms);

    let offset_map = root
        .join("packages")
        .join("fxp-encoder")
        .join("serum-offset-map.ts");
    let fxp_watch = std::env::var("ALCHEMIST_FXP_WATCH_DIR")
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("/tmp/alchemist_fxp"));
    let web_out = root.join("apps").join("web-app").join("output");

    log_line(WatcherLogLine {
        ts: Utc::now().to_rfc3339(),
        event: "watcher_daemon_start".to_string(),
        path: root.display().to_string(),
        action: "armed".to_string(),
        hard_gate_ok: None,
        provenance: "watcher-daemon".to_string(),
        note: Some(format!(
            "debounce_ms={debounce_ms}; offset_map={}; fxp_watch={};",
            offset_map.display(),
            fxp_watch.display()
        )),
    });

    let (tx, rx) = mpsc::channel::<Event>();

    let mut watcher = RecommendedWatcher::new(
        move |res: notify::Result<Event>| {
            if let Ok(ev) = res {
                let _ = tx.send(ev);
            }
        },
        Config::default(),
    )?;

    if offset_map.is_file() {
        watcher.watch(&offset_map, RecursiveMode::NonRecursive)?;
    } else {
        log_line(WatcherLogLine {
            ts: Utc::now().to_rfc3339(),
            event: "watcher_daemon_warn".to_string(),
            path: offset_map.display().to_string(),
            action: "skip_missing_offset_map".to_string(),
            hard_gate_ok: None,
            provenance: "watcher-daemon".to_string(),
            note: None,
        });
    }

    if fxp_watch.is_dir() {
        watcher.watch(&fxp_watch, RecursiveMode::Recursive)?;
    } else {
        log_line(WatcherLogLine {
            ts: Utc::now().to_rfc3339(),
            event: "watcher_daemon_warn".to_string(),
            path: fxp_watch.display().to_string(),
            action: "skip_missing_fxp_watch_dir".to_string(),
            hard_gate_ok: None,
            provenance: "watcher-daemon".to_string(),
            note: Some("Create dir or set ALCHEMIST_FXP_WATCH_DIR".to_string()),
        });
    }

    if web_out.is_dir() {
        watcher.watch(&web_out, RecursiveMode::Recursive)?;
    }

    let mut last_fire: Option<Instant> = None;

    for ev in rx {
        let relevant = match ev.kind {
            EventKind::Modify(_) | EventKind::Create(_) => true,
            _ => false,
        };
        if !relevant {
            continue;
        }

        let mut hit = false;
        for p in &ev.paths {
            if path_matches_trigger(p, &root, &fxp_watch) {
                hit = true;
                log_line(WatcherLogLine {
                    ts: Utc::now().to_rfc3339(),
                    event: "watcher_daemon_fs_event".to_string(),
                    path: p.display().to_string(),
                    action: format!("{:?}", ev.kind),
                    hard_gate_ok: None,
                    provenance: "watcher-daemon".to_string(),
                    note: None,
                });
            }
        }

        if !hit {
            continue;
        }

        let now = Instant::now();
        if let Some(prev) = last_fire {
            if now.saturating_duration_since(prev) < debounce {
                continue;
            }
        }
        last_fire = Some(now);

        if run_hard_gate(&root) {
            trigger_ts_observer(&root, "watcher-daemon");
        }
    }

    Ok(())
}
