import { useEffect } from "react";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import { ipc } from "@/lib/ipc";
import { useStore } from "@/state/store";

/** Listen for OS-level folder drops on the current window. Dropped folders
 *  feed `addFoldersToWorkspace` — empty window → workspace; populated → append. */
export function useFolderDrop() {
  useEffect(() => {
    let unlisten: (() => void) | null = null;
    let cancelled = false;

    (async () => {
      try {
        const win = getCurrentWebviewWindow();
        const stop = await win.onDragDropEvent(async (e) => {
          if (e.payload.type !== "drop") return;
          const paths = e.payload.paths;
          if (!paths || paths.length === 0) return;
          const checks = await Promise.all(
            paths.map((p) => ipc.pathIsDir(p).catch(() => false))
          );
          const dirs = paths.filter((_, i) => checks[i]);
          if (dirs.length === 0) return;
          useStore.getState().addFoldersToWorkspace(dirs);
        });
        if (cancelled) stop();
        else unlisten = stop;
      } catch {
        /* not under Tauri (web preview) */
      }
    })();

    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);
}
