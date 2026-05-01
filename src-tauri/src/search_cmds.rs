use ignore::WalkBuilder;
use serde::Serialize;
use std::path::Path;

#[derive(Serialize)]
pub struct SearchHit {
    pub path: String,
    pub line: usize,
    pub text: String,
}

#[tauri::command]
pub async fn search_workspace(workdir: String, query: String) -> Result<Vec<SearchHit>, String> {
    if query.is_empty() {
        return Ok(Vec::new());
    }
    let needle = query.clone();
    tokio::task::spawn_blocking(move || {
        let mut hits = Vec::new();
        let walker = WalkBuilder::new(Path::new(&workdir))
            .hidden(false)
            .git_ignore(true)
            .build();
        for result in walker {
            if hits.len() >= 200 {
                break;
            }
            let entry = match result {
                Ok(e) => e,
                Err(_) => continue,
            };
            if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
                continue;
            }
            let path = entry.path();
            let contents = match std::fs::read_to_string(path) {
                Ok(c) => c,
                Err(_) => continue,
            };
            for (i, line) in contents.lines().enumerate() {
                if line.contains(&needle) {
                    hits.push(SearchHit {
                        path: path.to_string_lossy().to_string(),
                        line: i + 1,
                        text: line.trim().to_string(),
                    });
                    if hits.len() >= 200 {
                        break;
                    }
                }
            }
        }
        Ok(hits)
    })
    .await
    .map_err(|e| e.to_string())?
}
