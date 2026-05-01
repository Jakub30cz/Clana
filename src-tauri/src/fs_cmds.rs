use serde::Serialize;
use std::path::PathBuf;

#[derive(Serialize)]
pub struct DirEntry {
    pub name: String,
    pub path: String,
    pub is_dir: bool,
}

#[tauri::command]
pub async fn list_dir(path: String) -> Result<Vec<DirEntry>, String> {
    let p = PathBuf::from(&path);
    let mut entries = Vec::new();
    let read = tokio::fs::read_dir(&p).await.map_err(|e| e.to_string())?;
    let mut read = read;
    while let Some(entry) = read.next_entry().await.map_err(|e| e.to_string())? {
        let meta = match entry.metadata().await {
            Ok(m) => m,
            Err(_) => continue,
        };
        let name = entry.file_name().to_string_lossy().to_string();
        if name.starts_with('.') && name != ".gitignore" && name != ".github" && name != ".env.example" {
            continue;
        }
        if name == "node_modules" || name == "target" || name == "dist" {
            continue;
        }
        entries.push(DirEntry {
            name,
            path: entry.path().to_string_lossy().to_string(),
            is_dir: meta.is_dir(),
        });
    }
    entries.sort_by(|a, b| match (a.is_dir, b.is_dir) {
        (true, false) => std::cmp::Ordering::Less,
        (false, true) => std::cmp::Ordering::Greater,
        _ => a.name.to_lowercase().cmp(&b.name.to_lowercase()),
    });
    Ok(entries)
}

#[tauri::command]
pub async fn read_text(path: String) -> Result<String, String> {
    tokio::fs::read_to_string(&path).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn write_text(path: String, contents: String) -> Result<(), String> {
    tokio::fs::write(&path, contents).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn path_exists(path: String) -> bool {
    tokio::fs::try_exists(&path).await.unwrap_or(false)
}
