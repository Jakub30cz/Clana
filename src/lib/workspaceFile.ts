import { ipc } from "@/lib/ipc";
import type { WorkspaceFile } from "@/state/store";

interface DiskShape {
  name?: string;
  folders: Array<{ path: string }>;
}

export function serializeWorkspace(ws: WorkspaceFile): string {
  const out: DiskShape = {
    name: ws.name,
    folders: ws.folders.map((p) => ({ path: p })),
  };
  return JSON.stringify(out, null, 2) + "\n";
}

export function parseWorkspace(json: string): Omit<WorkspaceFile, "filePath"> {
  const raw = JSON.parse(json) as Partial<DiskShape>;
  if (!raw || !Array.isArray(raw.folders)) {
    throw new Error("invalid workspace file: missing 'folders' array");
  }
  const folders = raw.folders
    .map((f) => (f && typeof f.path === "string" ? f.path : null))
    .filter((p): p is string => Boolean(p));
  if (folders.length === 0) {
    throw new Error("invalid workspace file: 'folders' is empty");
  }
  return {
    name: typeof raw.name === "string" ? raw.name : undefined,
    folders,
  };
}

export async function loadWorkspaceFromDisk(filePath: string): Promise<WorkspaceFile> {
  const json = await ipc.readText(filePath);
  const parsed = parseWorkspace(json);
  return { ...parsed, filePath };
}

export async function writeWorkspaceToDisk(filePath: string, ws: WorkspaceFile): Promise<void> {
  await ipc.writeText(filePath, serializeWorkspace(ws));
}
