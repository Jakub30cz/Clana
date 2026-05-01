mod fs_cmds;
mod git_cmds;
mod menu;
mod pty_cmds;
mod search_cmds;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let pty_state = pty_cmds::PtyState::default();
    let menu_state = menu::MenuState::default();

    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_os::init())
        .manage(pty_state)
        .manage(menu_state)
        .menu(|app| menu::build(app, &[], false))
        .on_menu_event(|app, event| menu::handle_event(app, event))
        .setup(|app| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = menu::apply_window_chrome(&win);
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            fs_cmds::list_dir,
            fs_cmds::read_text,
            fs_cmds::write_text,
            fs_cmds::path_exists,
            fs_cmds::path_is_dir,
            fs_cmds::create_file,
            fs_cmds::create_dir,
            fs_cmds::rename_path,
            fs_cmds::delete_path,
            fs_cmds::reveal_in_explorer,
            git_cmds::git_branch,
            git_cmds::git_branches,
            git_cmds::git_commit_graph,
            pty_cmds::pty_spawn,
            pty_cmds::pty_write,
            pty_cmds::pty_resize,
            pty_cmds::pty_kill,
            search_cmds::search_workspace,
            menu::update_recent_menu,
            menu::set_workspace_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
