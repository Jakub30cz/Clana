use git2::{BranchType, Repository, Sort};
use serde::Serialize;
use std::collections::BTreeMap;
use std::path::Path;

fn discover(workdir: &str) -> Result<Repository, String> {
    Repository::discover(Path::new(workdir)).map_err(|e| e.message().to_string())
}

#[tauri::command]
pub fn git_branch(workdir: String) -> Result<String, String> {
    let repo = match discover(&workdir) {
        Ok(r) => r,
        Err(_) => return Ok(String::new()),
    };
    let head = repo.head().map_err(|e| e.message().to_string())?;
    Ok(head.shorthand().unwrap_or("HEAD").to_string())
}

#[derive(Serialize, Default)]
pub struct GitBranches {
    pub current: String,
    pub detached: bool,
    pub head_short: String,
    pub local: Vec<BranchInfo>,
    pub remotes: Vec<RemoteGroup>,
}

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_current: bool,
    pub upstream: Option<String>,
    pub ahead: usize,
    pub behind: usize,
}

#[derive(Serialize)]
pub struct RemoteGroup {
    pub name: String,
    pub branches: Vec<BranchInfo>,
}

#[tauri::command]
pub fn git_branches(workdir: String) -> Result<GitBranches, String> {
    let repo = match discover(&workdir) {
        Ok(r) => r,
        Err(_) => return Ok(GitBranches::default()),
    };

    let head = repo.head().ok();
    let current = head
        .as_ref()
        .and_then(|h| h.shorthand().map(|s| s.to_string()))
        .unwrap_or_default();
    let detached = head.as_ref().map(|h| !h.is_branch()).unwrap_or(false);
    let head_short = head
        .as_ref()
        .and_then(|h| h.target())
        .map(|oid| {
            let s = oid.to_string();
            s.chars().take(7).collect::<String>()
        })
        .unwrap_or_default();

    // Local branches
    let mut local: Vec<BranchInfo> = Vec::new();
    if let Ok(iter) = repo.branches(Some(BranchType::Local)) {
        for entry in iter.flatten() {
            let (branch, _) = entry;
            let Ok(Some(name)) = branch.name() else { continue };
            let name = name.to_string();
            let is_current = name == current;

            let upstream = branch.upstream().ok();
            let upstream_name = upstream
                .as_ref()
                .and_then(|u| u.name().ok().flatten().map(|s| s.to_string()));

            let (ahead, behind) = match (
                branch.get().target(),
                upstream.as_ref().and_then(|u| u.get().target()),
            ) {
                (Some(local_oid), Some(remote_oid)) => {
                    repo.graph_ahead_behind(local_oid, remote_oid).unwrap_or((0, 0))
                }
                _ => (0, 0),
            };

            local.push(BranchInfo {
                name,
                is_current,
                upstream: upstream_name,
                ahead,
                behind,
            });
        }
    }
    local.sort_by(|a, b| a.name.cmp(&b.name));

    // Remote branches grouped by remote name
    let mut groups: BTreeMap<String, Vec<BranchInfo>> = BTreeMap::new();
    if let Ok(iter) = repo.branches(Some(BranchType::Remote)) {
        for entry in iter.flatten() {
            let (branch, _) = entry;
            let Ok(Some(name)) = branch.name() else { continue };
            // skip symbolic origin/HEAD (it's just a pointer)
            if name.ends_with("/HEAD") {
                continue;
            }
            let mut split = name.splitn(2, '/');
            let remote = split.next().unwrap_or("").to_string();
            let rest = split.next().unwrap_or("").to_string();
            if remote.is_empty() || rest.is_empty() {
                continue;
            }
            groups.entry(remote).or_default().push(BranchInfo {
                name: rest,
                is_current: false,
                upstream: None,
                ahead: 0,
                behind: 0,
            });
        }
    }
    let mut remotes: Vec<RemoteGroup> = groups
        .into_iter()
        .map(|(name, mut branches)| {
            branches.sort_by(|a, b| a.name.cmp(&b.name));
            RemoteGroup { name, branches }
        })
        .collect();
    remotes.sort_by(|a, b| a.name.cmp(&b.name));

    Ok(GitBranches {
        current,
        detached,
        head_short,
        local,
        remotes,
    })
}

#[derive(Serialize, Default)]
pub struct CommitGraph {
    pub commits: Vec<CommitInfo>,
    pub refs_by_oid: BTreeMap<String, Vec<RefInfo>>,
    pub head: String,
}

#[derive(Serialize)]
pub struct CommitInfo {
    pub oid: String,
    pub short: String,
    pub parents: Vec<String>,
    pub message: String,
    pub author: String,
    pub time: i64,
}

#[derive(Serialize)]
pub struct RefInfo {
    pub name: String,
    pub kind: String, // "local" | "remote" | "tag"
}

#[tauri::command]
pub fn git_commit_graph(workdir: String, limit: Option<usize>) -> Result<CommitGraph, String> {
    let repo = match discover(&workdir) {
        Ok(r) => r,
        Err(_) => return Ok(CommitGraph::default()),
    };
    let limit = limit.unwrap_or(300).min(2000);

    let mut walk = repo.revwalk().map_err(|e| e.message().to_string())?;
    let _ = walk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME);
    let _ = walk.push_glob("refs/heads/*");
    let _ = walk.push_glob("refs/remotes/*");

    let mut commits = Vec::new();
    for oid_res in walk {
        if commits.len() >= limit {
            break;
        }
        let oid = match oid_res {
            Ok(o) => o,
            Err(_) => continue,
        };
        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(_) => continue,
        };
        let oid_str = oid.to_string();
        let short = oid_str.chars().take(7).collect::<String>();
        let parents: Vec<String> = commit.parent_ids().map(|p| p.to_string()).collect();
        let message = commit.summary().unwrap_or("").to_string();
        let author = commit.author().name().unwrap_or("").to_string();
        let time = commit.time().seconds();
        commits.push(CommitInfo {
            oid: oid_str,
            short,
            parents,
            message,
            author,
            time,
        });
    }

    // Collect refs grouped by their target oid.
    let mut refs_by_oid: BTreeMap<String, Vec<RefInfo>> = BTreeMap::new();
    if let Ok(refs) = repo.references() {
        for r_res in refs {
            let r = match r_res {
                Ok(r) => r,
                Err(_) => continue,
            };
            let name = match r.shorthand() {
                Some(s) if !s.ends_with("/HEAD") => s.to_string(),
                _ => continue,
            };
            let target = match r.target() {
                Some(o) => o.to_string(),
                None => continue,
            };
            let kind = if r.is_branch() {
                "local"
            } else if r.is_remote() {
                "remote"
            } else if r.is_tag() {
                "tag"
            } else {
                continue;
            };
            refs_by_oid
                .entry(target)
                .or_default()
                .push(RefInfo {
                    name,
                    kind: kind.into(),
                });
        }
    }

    let head = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .map(|o| o.to_string())
        .unwrap_or_default();

    Ok(CommitGraph {
        commits,
        refs_by_oid,
        head,
    })
}
