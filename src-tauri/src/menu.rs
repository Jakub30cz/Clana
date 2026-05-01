use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{
        AboutMetadata, Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
    },
    AppHandle, Emitter, Manager, Runtime, WebviewUrl, WebviewWindowBuilder,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "lowercase")]
pub enum RecentEntry {
    Folder { path: String, name: String },
    Workspace { file_path: String, name: String },
}

#[derive(Default)]
pub struct MenuState {
    pub recent: Mutex<Vec<RecentEntry>>,
    pub workspace_active: Mutex<bool>,
}

pub fn build<R: Runtime>(
    app: &AppHandle<R>,
    recent: &[RecentEntry],
    workspace_active: bool,
) -> tauri::Result<Menu<R>> {
    // App menu (only visible on macOS, but harmless elsewhere).
    let app_submenu = SubmenuBuilder::new(app, "Clana")
        .about(Some(AboutMetadata {
            name: Some("Clana".into()),
            version: Some(env!("CARGO_PKG_VERSION").into()),
            short_version: Some(env!("CARGO_PKG_VERSION").into()),
            authors: Some(vec!["Jakub Jüthner".into()]),
            comments: Some("Minimalist vibe-coding IDE".into()),
            ..Default::default()
        }))
        .separator()
        .item(
            &MenuItemBuilder::with_id("settings", "Settings…")
                .accelerator("CmdOrCtrl+,")
                .build(app)?,
        )
        .separator()
        .services()
        .separator()
        .hide()
        .hide_others()
        .show_all()
        .separator()
        .quit()
        .build()?;

    // Open Recent submenu (rebuilt from frontend whenever the list changes).
    let mut recent_builder = SubmenuBuilder::new(app, "Open Recent");
    if recent.is_empty() {
        recent_builder = recent_builder.item(
            &MenuItemBuilder::with_id("recent_empty", "(no recent folders)")
                .enabled(false)
                .build(app)?,
        );
    } else {
        for (i, item) in recent.iter().enumerate().take(10) {
            let (id, label) = match item {
                RecentEntry::Folder { path, name } => (
                    format!("recent_f_{}", i),
                    format!("{}  —  {}", name, short_path(path)),
                ),
                RecentEntry::Workspace { file_path, name } => (
                    format!("recent_w_{}", i),
                    format!("[ws] {}  —  {}", name, short_path(file_path)),
                ),
            };
            recent_builder =
                recent_builder.item(&MenuItemBuilder::with_id(&id, &label).build(app)?);
        }
        recent_builder = recent_builder
            .separator()
            .item(&MenuItemBuilder::with_id("recent_clear", "Clear Menu").build(app)?);
    }
    let recent_submenu = recent_builder.build()?;

    let file_menu = SubmenuBuilder::new(app, "File")
        .item(
            &MenuItemBuilder::with_id("new_window", "New Window")
                .accelerator("CmdOrCtrl+Shift+N")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("open_folder", "Open Folder…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("open_workspace_file", "Open Workspace from File…")
                .accelerator("CmdOrCtrl+Shift+O")
                .build(app)?,
        )
        .item(&recent_submenu)
        .separator()
        .item(&MenuItemBuilder::with_id("add_folder", "Add Folder to Workspace…").build(app)?)
        .item(
            &MenuItemBuilder::with_id("save_workspace_as", "Save Workspace As…")
                .accelerator("CmdOrCtrl+Alt+S")
                .enabled(workspace_active)
                .build(app)?,
        )
        .separator()
        .item(&MenuItemBuilder::with_id("close_folder", "Close Folder / Workspace").build(app)?)
        .build()?;

    let edit_menu = SubmenuBuilder::new(app, "Edit")
        .undo()
        .redo()
        .separator()
        .cut()
        .copy()
        .paste()
        .select_all()
        .build()?;

    let view_menu = SubmenuBuilder::new(app, "View")
        .item(
            &MenuItemBuilder::with_id("layout_classic", "Layout: Classic")
                .accelerator("CmdOrCtrl+1")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("layout_zen", "Layout: Zen")
                .accelerator("CmdOrCtrl+2")
                .build(app)?,
        )
        .item(
            &MenuItemBuilder::with_id("layout_tiled", "Layout: Tiled")
                .accelerator("CmdOrCtrl+3")
                .build(app)?,
        )
        .separator()
        .item(
            &MenuItemBuilder::with_id("command_palette", "Command Palette")
                .accelerator("CmdOrCtrl+K")
                .build(app)?,
        )
        .separator()
        .item(&PredefinedMenuItem::fullscreen(app, None)?)
        .build()?;

    let window_menu = SubmenuBuilder::new(app, "Window")
        .minimize()
        .build()?;

    MenuBuilder::new(app)
        .items(&[
            &app_submenu,
            &file_menu,
            &edit_menu,
            &view_menu,
            &window_menu,
        ])
        .build()
}

fn short_path(p: &str) -> String {
    if let Ok(home) = std::env::var("HOME") {
        if !home.is_empty() && p.starts_with(&home) {
            return format!("~{}", &p[home.len()..]);
        }
    }
    p.to_string()
}

/// Apply title-bar styling that matches the static `main` window — used both for
/// the bundled main window and any window spawned at runtime via `New Window`.
pub fn apply_window_chrome<R: Runtime>(
    win: &tauri::WebviewWindow<R>,
) -> tauri::Result<()> {
    #[cfg(target_os = "macos")]
    {
        use tauri::TitleBarStyle;
        let _ = win.set_title_bar_style(TitleBarStyle::Overlay);
    }
    let _ = win;
    Ok(())
}

pub fn handle_event<R: Runtime>(app: &AppHandle<R>, event: tauri::menu::MenuEvent) {
    let id = event.id().0.as_str().to_string();

    if let Some(rest) = id.strip_prefix("recent_") {
        if rest == "clear" {
            let _ = app.emit("menu:recent_clear", ());
            return;
        }
        if rest == "empty" {
            return;
        }
        // Tagged ids: `recent_f_<idx>` or `recent_w_<idx>`.
        let (kind, idx_str) = if let Some(s) = rest.strip_prefix("f_") {
            ("f", s)
        } else if let Some(s) = rest.strip_prefix("w_") {
            ("w", s)
        } else {
            // Legacy "recent_<idx>" — treat as folder for compatibility.
            ("f", rest)
        };
        if let Ok(idx) = idx_str.parse::<usize>() {
            let entry = app.state::<MenuState>().recent.lock().get(idx).cloned();
            if let Some(e) = entry {
                match (kind, e) {
                    ("f", RecentEntry::Folder { path, .. }) => {
                        let _ = app.emit("menu:open_recent_folder", path);
                    }
                    ("w", RecentEntry::Workspace { file_path, .. }) => {
                        let _ = app.emit("menu:open_recent_workspace", file_path);
                    }
                    _ => {}
                }
            }
        }
        return;
    }

    match id.as_str() {
        "new_window" => {
            spawn_new_window(app);
        }
        "open_folder" => {
            let _ = app.emit("menu:open_folder", ());
        }
        "open_workspace_file" => {
            let _ = app.emit("menu:open_workspace_file", ());
        }
        "add_folder" => {
            let _ = app.emit("menu:add_folder", ());
        }
        "save_workspace_as" => {
            let _ = app.emit("menu:save_workspace_as", ());
        }
        "close_folder" => {
            let _ = app.emit("menu:close_folder", ());
        }
        "settings" => {
            let _ = app.emit("menu:settings", ());
        }
        "command_palette" => {
            let _ = app.emit("menu:command_palette", ());
        }
        "layout_classic" => {
            let _ = app.emit("menu:layout", "classic");
        }
        "layout_zen" => {
            let _ = app.emit("menu:layout", "zen");
        }
        "layout_tiled" => {
            let _ = app.emit("menu:layout", "tiled");
        }
        _ => {}
    }
}

fn spawn_new_window<R: Runtime>(app: &AppHandle<R>) {
    let label = format!(
        "w{}",
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map(|d| d.as_millis())
            .unwrap_or(0)
    );
    let builder = WebviewWindowBuilder::new(app, &label, WebviewUrl::App("index.html".into()))
        .title("Clana")
        .inner_size(1280.0, 800.0)
        .min_inner_size(800.0, 480.0);
    #[cfg(target_os = "macos")]
    let builder = builder
        .title_bar_style(tauri::TitleBarStyle::Overlay)
        .hidden_title(true);
    if let Ok(win) = builder.build() {
        let _ = apply_window_chrome(&win);
    }
}

#[tauri::command]
pub async fn update_recent_menu(
    app: AppHandle,
    state: tauri::State<'_, MenuState>,
    items: Vec<RecentEntry>,
) -> Result<(), String> {
    *state.recent.lock() = items.clone();
    let workspace_active = *state.workspace_active.lock();
    let menu = build(&app, &items, workspace_active).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn set_workspace_state(
    app: AppHandle,
    state: tauri::State<'_, MenuState>,
    active: bool,
) -> Result<(), String> {
    *state.workspace_active.lock() = active;
    let recent = state.recent.lock().clone();
    let menu = build(&app, &recent, active).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}
