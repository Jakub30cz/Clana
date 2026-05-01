import { invoke } from "@tauri-apps/api/core";

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface BranchInfo {
  name: string;
  is_current: boolean;
  upstream: string | null;
  ahead: number;
  behind: number;
}

export interface RemoteGroup {
  name: string;
  branches: BranchInfo[];
}

export interface GitBranches {
  current: string;
  detached: boolean;
  head_short: string;
  local: BranchInfo[];
  remotes: RemoteGroup[];
}

export interface CommitInfo {
  oid: string;
  short: string;
  parents: string[];
  message: string;
  author: string;
  time: number;
}

export interface RefInfo {
  name: string;
  kind: "local" | "remote" | "tag";
}

export interface CommitGraph {
  commits: CommitInfo[];
  refs_by_oid: Record<string, RefInfo[]>;
  head: string;
}

export interface SearchHit {
  path: string;
  line: number;
  text: string;
}

export const ipc = {
  listDir: (path: string) => invoke<DirEntry[]>("list_dir", { path }),
  readText: (path: string) => invoke<string>("read_text", { path }),
  writeText: (path: string, contents: string) => invoke<void>("write_text", { path, contents }),
  pathExists: (path: string) => invoke<boolean>("path_exists", { path }),
  pathIsDir: (path: string) => invoke<boolean>("path_is_dir", { path }),
  createFile: (path: string) => invoke<void>("create_file", { path }),
  createDir: (path: string) => invoke<void>("create_dir", { path }),
  movePath: (from: string, to: string) => invoke<void>("rename_path", { from, to }),
  deletePath: (path: string) => invoke<void>("delete_path", { path }),
  revealInExplorer: (path: string) => invoke<void>("reveal_in_explorer", { path }),

  gitBranch: (workdir: string) => invoke<string>("git_branch", { workdir }),
  gitBranches: (workdir: string) => invoke<GitBranches>("git_branches", { workdir }),
  gitCommitGraph: (workdir: string, limit?: number) =>
    invoke<CommitGraph>("git_commit_graph", { workdir, limit }),

  ptySpawn: (opts: { id: string; cwd: string; kind: "shell" | "claude"; cols: number; rows: number }) =>
    invoke<void>("pty_spawn", { opts }),
  ptyWrite: (id: string, data: string) => invoke<void>("pty_write", { id, data }),
  ptyResize: (id: string, cols: number, rows: number) =>
    invoke<void>("pty_resize", { id, cols, rows }),
  ptyKill: (id: string) => invoke<void>("pty_kill", { id }),

  search: (workdir: string, query: string) =>
    invoke<SearchHit[]>("search_workspace", { workdir, query }),
};

/** Best-effort: ignore Tauri-not-available errors during web-only dev. */
export async function safeIpc<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch {
    return fallback;
  }
}
