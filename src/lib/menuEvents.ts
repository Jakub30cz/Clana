import { useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { save, open } from "@tauri-apps/plugin-dialog";
import { useStore, type RecentEntry } from "@/state/store";
import { openFolderDialog } from "@/lib/dialog";
import {
  loadWorkspaceFromDisk,
  writeWorkspaceToDisk,
} from "@/lib/workspaceFile";
import type { LayoutMode } from "@/state/layouts";

/** Wire shape sent to Rust — matches the tagged enum in src-tauri/src/menu.rs.
 *  serde with `#[serde(tag = "kind", rename_all = "lowercase")]` and `field_path`. */
type WireRecent =
  | { kind: "folder"; path: string; name: string }
  | { kind: "workspace"; file_path: string; name: string };

function toWire(r: RecentEntry): WireRecent {
  return r.kind === "folder"
    ? { kind: "folder", path: r.path, name: r.name }
    : { kind: "workspace", file_path: r.filePath, name: r.name };
}

async function pickAndOpenWorkspaceFile() {
  const picked = await open({
    multiple: false,
    title: "Open Workspace",
    filters: [{ name: "Clana Workspace", extensions: ["clana-workspace.json", "json"] }],
  });
  const filePath = typeof picked === "string" ? picked : null;
  if (!filePath) return;
  try {
    const ws = await loadWorkspaceFromDisk(filePath);
    useStore.getState().openWorkspaceFile(filePath, ws);
  } catch (e) {
    console.error("failed to load workspace", e);
  }
}

async function pickAndAddFolder() {
  const path = await openFolderDialog();
  if (path) useStore.getState().addFoldersToWorkspace([path]);
}

async function saveWorkspaceAs() {
  const s = useStore.getState();
  const ws = s.workspace;
  if (!ws) return;
  const defaultName = (ws.name || "workspace") + ".clana-workspace.json";
  const filePath = await save({
    title: "Save Workspace",
    defaultPath: ws.filePath || defaultName,
    filters: [{ name: "Clana Workspace", extensions: ["clana-workspace.json", "json"] }],
  });
  if (!filePath) return;
  // Derive name from chosen filename if user hasn't set one explicitly.
  const baseName = filePath
    .split(/[\\/]/)
    .pop()
    ?.replace(/\.clana-workspace(\.json)?$/i, "")
    ?.replace(/\.json$/i, "");
  const finalName = ws.name && ws.name !== "Untitled Workspace" ? ws.name : baseName || ws.name;
  const updated = { ...ws, filePath, name: finalName };
  try {
    await writeWorkspaceToDisk(filePath, updated);
    useStore.getState().setWorkspaceMeta(filePath, finalName);
  } catch (e) {
    console.error("failed to save workspace", e);
  }
}

/** Listens to native menu events and pushes the recent list + workspace-active
 *  state back to Rust so the menu always reflects the current store. */
export function useMenuEvents() {
  const recent = useStore((s) => s.recentEntries);
  const workspaceActive = useStore((s) => s.workspace !== null);

  // Push recent list to native menu whenever it changes.
  useEffect(() => {
    invoke("update_recent_menu", { items: recent.map(toWire) }).catch(() => {
      /* not running under Tauri (e.g. plain web preview) */
    });
  }, [recent]);

  // Push workspace-active flag (controls Save Workspace As… enabled state).
  useEffect(() => {
    invoke("set_workspace_state", { active: workspaceActive }).catch(() => {});
  }, [workspaceActive]);

  useEffect(() => {
    const unsubs: UnlistenFn[] = [];

    const setup = async () => {
      unsubs.push(
        await listen<null>("menu:open_folder", async () => {
          const path = await openFolderDialog(useStore.getState().getPrimaryFolder() || undefined);
          if (path) useStore.getState().openFolder(path);
        })
      );
      unsubs.push(
        await listen<null>("menu:open_workspace_file", () => {
          void pickAndOpenWorkspaceFile();
        })
      );
      unsubs.push(
        await listen<null>("menu:add_folder", () => {
          void pickAndAddFolder();
        })
      );
      unsubs.push(
        await listen<null>("menu:save_workspace_as", () => {
          void saveWorkspaceAs();
        })
      );
      unsubs.push(
        await listen<null>("menu:close_folder", () => {
          useStore.getState().closeFolder();
        })
      );
      unsubs.push(
        await listen<string>("menu:open_recent_folder", (ev) => {
          if (ev.payload) useStore.getState().openFolder(ev.payload);
        })
      );
      unsubs.push(
        await listen<string>("menu:open_recent_workspace", async (ev) => {
          if (!ev.payload) return;
          try {
            const ws = await loadWorkspaceFromDisk(ev.payload);
            useStore.getState().openWorkspaceFile(ev.payload, ws);
          } catch (e) {
            console.error("failed to load recent workspace", e);
          }
        })
      );
      unsubs.push(
        await listen<null>("menu:recent_clear", () => {
          useStore.getState().clearRecentEntries();
        })
      );
      unsubs.push(
        await listen<LayoutMode>("menu:layout", (ev) => {
          useStore.getState().setLayout(ev.payload);
        })
      );
      unsubs.push(
        await listen<null>("menu:command_palette", () => {
          useStore.getState().setPaletteOpen(true);
        })
      );
      unsubs.push(
        await listen<null>("menu:settings", () => {
          useStore.getState().setSidePanel("settings");
        })
      );
    };
    setup();

    return () => {
      unsubs.forEach((u) => u());
    };
  }, []);
}
