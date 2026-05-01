use parking_lot::Mutex;
use portable_pty::{native_pty_system, Child, CommandBuilder, MasterPty, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{Read, Write};
use std::sync::Arc;
use tauri::{AppHandle, Emitter, State};

#[derive(Default)]
pub struct PtyState {
    sessions: Arc<Mutex<HashMap<String, PtySession>>>,
}

struct PtySession {
    master: Box<dyn MasterPty + Send>,
    writer: Box<dyn Write + Send>,
    child: Box<dyn Child + Send + Sync>,
}

#[derive(Deserialize)]
pub struct SpawnOpts {
    pub id: String,
    pub cwd: String,
    /// "shell" | "claude"
    pub kind: String,
    pub cols: u16,
    pub rows: u16,
}

#[derive(Serialize, Clone)]
struct PtyDataEvent {
    id: String,
    data: String,
}

#[derive(Serialize, Clone)]
struct PtyExitEvent {
    id: String,
    code: Option<i32>,
}

#[tauri::command]
pub fn pty_spawn(
    app: AppHandle,
    state: State<'_, PtyState>,
    opts: SpawnOpts,
) -> Result<(), String> {
    let pty_system = native_pty_system();
    let pair = pty_system
        .openpty(PtySize {
            rows: opts.rows.max(10),
            cols: opts.cols.max(40),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let shell_cmd = if cfg!(windows) {
        std::env::var("COMSPEC").unwrap_or_else(|_| "powershell.exe".into())
    } else {
        std::env::var("SHELL").unwrap_or_else(|_| "/bin/zsh".into())
    };

    let mut cmd = CommandBuilder::new(&shell_cmd);
    cmd.cwd(&opts.cwd);
    if !cfg!(windows) {
        cmd.env("TERM", "xterm-256color");
    }

    let child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = opts.id.clone();
    let kind = opts.kind.clone();

    {
        let mut sessions = state.sessions.lock();
        sessions.insert(
            id.clone(),
            PtySession {
                master: pair.master,
                writer,
                child,
            },
        );
    }

    // If user asked for the Claude variant, kick it off automatically.
    if kind == "claude" {
        let mut sessions = state.sessions.lock();
        if let Some(s) = sessions.get_mut(&id) {
            let _ = s.writer.write_all(b"claude\n");
        }
    }

    let app_clone = app.clone();
    let id_for_reader = id.clone();
    std::thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let data = String::from_utf8_lossy(&buf[..n]).into_owned();
                    let _ = app_clone.emit(
                        "pty:data",
                        PtyDataEvent {
                            id: id_for_reader.clone(),
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }
        let _ = app_clone.emit(
            "pty:exit",
            PtyExitEvent {
                id: id_for_reader,
                code: None,
            },
        );
    });

    Ok(())
}

#[tauri::command]
pub fn pty_write(state: State<'_, PtyState>, id: String, data: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock();
    let session = sessions
        .get_mut(&id)
        .ok_or_else(|| format!("no pty session: {}", id))?;
    session
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_resize(
    state: State<'_, PtyState>,
    id: String,
    cols: u16,
    rows: u16,
) -> Result<(), String> {
    let sessions = state.sessions.lock();
    let session = sessions
        .get(&id)
        .ok_or_else(|| format!("no pty session: {}", id))?;
    session
        .master
        .resize(PtySize {
            rows: rows.max(2),
            cols: cols.max(2),
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn pty_kill(state: State<'_, PtyState>, id: String) -> Result<(), String> {
    let mut sessions = state.sessions.lock();
    if let Some(mut session) = sessions.remove(&id) {
        let _ = session.child.kill();
    }
    Ok(())
}
