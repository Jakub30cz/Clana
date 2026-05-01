mod fs_cmds;
mod git_cmds;
mod pty_cmds;
mod search_cmds;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_state = pty_cmds::PtyState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .manage(pty_state)
        .setup(|app| {
            #[cfg(target_os = "macos")]
            {
                use tauri::TitleBarStyle;
                if let Some(win) = app.get_webview_window("main") {
                    let _ = win.set_title_bar_style(TitleBarStyle::Overlay);
                }
            }
            let _ = app;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs_cmds::list_dir,
            fs_cmds::read_text,
            fs_cmds::write_text,
            fs_cmds::path_exists,
            git_cmds::git_status,
            git_cmds::git_branch,
            pty_cmds::pty_spawn,
            pty_cmds::pty_write,
            pty_cmds::pty_resize,
            pty_cmds::pty_kill,
            search_cmds::search_workspace,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
