import { invoke } from "@tauri-apps/api/core";

export interface DirEntry {
  name: string;
  path: string;
  is_dir: boolean;
}

export interface GitFileChange {
  path: string;
  status: string;
}

export interface GitStatus {
  branch: string;
  ahead: number;
  behind: number;
  staged: GitFileChange[];
  changes: GitFileChange[];
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

  gitStatus: (workdir: string) => invoke<GitStatus>("git_status", { workdir }),
  gitBranch: (workdir: string) => invoke<string>("git_branch", { workdir }),

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
