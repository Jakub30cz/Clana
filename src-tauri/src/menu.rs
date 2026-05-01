use parking_lot::Mutex;
use serde::{Deserialize, Serialize};
use tauri::{
    menu::{
        AboutMetadata, Menu, MenuBuilder, MenuItemBuilder, PredefinedMenuItem, SubmenuBuilder,
    },
    AppHandle, Emitter, Manager, Runtime,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentItem {
    pub path: String,
    pub name: String,
}

#[derive(Default)]
pub struct MenuRecent {
    pub items: Mutex<Vec<RecentItem>>,
}

pub fn build<R: Runtime>(
    app: &AppHandle<R>,
    recent: &[RecentItem],
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
            let id = format!("recent_{}", i);
            let label = format!("{}  —  {}", item.name, short_path(&item.path));
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
            &MenuItemBuilder::with_id("open_folder", "Open Folder…")
                .accelerator("CmdOrCtrl+O")
                .build(app)?,
        )
        .item(&recent_submenu)
        .separator()
        .item(&MenuItemBuilder::with_id("close_folder", "Close Folder").build(app)?)
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
        if let Ok(idx) = rest.parse::<usize>() {
            let path = app
                .state::<MenuRecent>()
                .items
                .lock()
                .get(idx)
                .map(|r| r.path.clone());
            if let Some(p) = path {
                let _ = app.emit("menu:open_recent", p);
            }
        }
        return;
    }

    match id.as_str() {
        "open_folder" => {
            let _ = app.emit("menu:open_folder", ());
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

#[tauri::command]
pub async fn update_recent_menu(
    app: AppHandle,
    state: tauri::State<'_, MenuRecent>,
    items: Vec<RecentItem>,
) -> Result<(), String> {
    *state.items.lock() = items.clone();
    let menu = build(&app, &items).map_err(|e| e.to_string())?;
    app.set_menu(menu).map_err(|e| e.to_string())?;
    Ok(())
}
