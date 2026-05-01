import { useEffect } from "react";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import { useStore } from "@/state/store";
import { openFolderDialog } from "@/lib/dialog";
import type { LayoutMode } from "@/state/layouts";

interface RecentItem {
  path: string;
  name: string;
}

/** Listens to native menu events and pushes the recent-workspaces list back
 *  to Rust so the "Open Recent" submenu always reflects the latest state. */
export function useMenuEvents() {
  const recent = useStore((s) => s.recentWorkspaces);

  // Push recent list to native menu whenever it changes.
  useEffect(() => {
    const items: RecentItem[] = recent.map((r) => ({ path: r.path, name: r.name }));
    invoke("update_recent_menu", { items }).catch(() => {
      /* not running under Tauri (e.g. plain web preview) */
    });
  }, [recent]);

  useEffect(() => {
    const unsubs: UnlistenFn[] = [];

    const setup = async () => {
      unsubs.push(
        await listen<null>("menu:open_folder", async () => {
          const path = await openFolderDialog(useStore.getState().workdir || undefined);
          if (path) useStore.getState().openWorkspace(path);
        })
      );
      unsubs.push(
        await listen<null>("menu:close_folder", () => {
          useStore.getState().setWorkdir("");
        })
      );
      unsubs.push(
        await listen<string>("menu:open_recent", (ev) => {
          if (ev.payload) useStore.getState().openWorkspace(ev.payload);
        })
      );
      unsubs.push(
        await listen<null>("menu:recent_clear", () => {
          useStore.getState().clearRecentWorkspaces();
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
