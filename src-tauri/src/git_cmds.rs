use git2::{Repository, Status, StatusOptions};
use serde::Serialize;
use std::path::Path;

#[derive(Serialize, Default)]
pub struct GitStatus {
    pub branch: String,
    pub ahead: usize,
    pub behind: usize,
    pub staged: Vec<GitFileChange>,
    pub changes: Vec<GitFileChange>,
}

#[derive(Serialize)]
pub struct GitFileChange {
    pub path: String,
    pub status: String,
}

fn discover(workdir: &str) -> Result<Repository, String> {
    Repository::discover(Path::new(workdir)).map_err(|e| e.message().to_string())
}

#[tauri::command]
pub fn git_status(workdir: String) -> Result<GitStatus, String> {
    let repo = match discover(&workdir) {
        Ok(r) => r,
        Err(_) => return Ok(GitStatus::default()),
    };

    let head = repo.head().ok();
    let branch = head
        .as_ref()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .unwrap_or_else(|| "HEAD".to_string());

    let (ahead, behind) = match (
        repo.head().ok().and_then(|h| h.target()),
        repo.find_branch(&format!("origin/{}", branch), git2::BranchType::Remote)
            .ok()
            .and_then(|b| b.get().target()),
    ) {
        (Some(local), Some(remote)) => repo.graph_ahead_behind(local, remote).unwrap_or((0, 0)),
        _ => (0, 0),
    };

    let mut opts = StatusOptions::new();
    opts.include_untracked(true).recurse_untracked_dirs(true);
    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.message().to_string())?;

    let mut staged = Vec::new();
    let mut changes = Vec::new();
    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        let s = entry.status();
        let staged_flags = Status::INDEX_NEW
            | Status::INDEX_MODIFIED
            | Status::INDEX_DELETED
            | Status::INDEX_RENAMED
            | Status::INDEX_TYPECHANGE;
        let wt_flags = Status::WT_NEW
            | Status::WT_MODIFIED
            | Status::WT_DELETED
            | Status::WT_TYPECHANGE
            | Status::WT_RENAMED;

        if s.intersects(staged_flags) {
            staged.push(GitFileChange {
                path: path.clone(),
                status: short_status(s, true),
            });
        }
        if s.intersects(wt_flags) {
            changes.push(GitFileChange {
                path,
                status: short_status(s, false),
            });
        }
    }

    Ok(GitStatus {
        branch,
        ahead,
        behind,
        staged,
        changes,
    })
}

fn short_status(s: Status, staged: bool) -> String {
    if staged {
        if s.contains(Status::INDEX_NEW) { "A".into() }
        else if s.contains(Status::INDEX_MODIFIED) { "M".into() }
        else if s.contains(Status::INDEX_DELETED) { "D".into() }
        else if s.contains(Status::INDEX_RENAMED) { "R".into() }
        else { "?".into() }
    } else if s.contains(Status::WT_NEW) { "U".into() }
    else if s.contains(Status::WT_MODIFIED) { "M".into() }
    else if s.contains(Status::WT_DELETED) { "D".into() }
    else if s.contains(Status::WT_RENAMED) { "R".into() }
    else { "?".into() }
}

#[tauri::command]
pub fn git_branch(workdir: String) -> Result<String, String> {
    let repo = discover(&workdir)?;
    let head = repo.head().map_err(|e| e.message().to_string())?;
    Ok(head.shorthand().unwrap_or("HEAD").to_string())
}
