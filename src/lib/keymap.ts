import { useEffect } from "react";
import { useStore } from "@/state/store";
import type { LayoutMode } from "@/state/layouts";
import { openFolderDialog } from "@/lib/dialog";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

function mod(e: KeyboardEvent) {
  return isMac ? e.metaKey : e.ctrlKey;
}

export function useGlobalKeymap() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const s = useStore.getState();
      const active = s.activePaneId;

      // ⌘K — palette
      if (mod(e) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        s.setPaletteOpen(true);
        return;
      }

      // ⌘J — Claude in new pane
      if (mod(e) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        s.splitPane(active, "h", "claude");
        return;
      }

      // Ctrl+` — shell terminal
      if (e.ctrlKey && e.key === "`") {
        e.preventDefault();
        s.splitPane(active, "v", "shell");
        return;
      }

      // ⌘\ — split right ;  ⌘⇧\ — split down
      if (mod(e) && e.key === "\\") {
        e.preventDefault();
        s.splitPane(active, e.shiftKey ? "v" : "h", "editor");
        return;
      }

      // ⌘W — close active pane
      if (mod(e) && e.key.toLowerCase() === "w") {
        e.preventDefault();
        s.closePane(active);
        return;
      }

      // ⌘O — open folder
      if (mod(e) && e.key.toLowerCase() === "o" && !e.shiftKey) {
        e.preventDefault();
        openFolderDialog(s.workdir || undefined).then((path) => {
          if (path) useStore.getState().openWorkspace(path);
        });
        return;
      }

      // ⌘1-3 — switch layout
      if (mod(e) && ["1", "2", "3"].includes(e.key)) {
        e.preventDefault();
        const map: Record<string, LayoutMode> = {
          "1": "classic",
          "2": "zen",
          "3": "tiled",
        };
        s.setLayout(map[e.key]);
        return;
      }

      // Escape — close overlays
      if (e.key === "Escape") {
        if (s.paletteOpen) s.setPaletteOpen(false);
        if (s.layoutMenuOpen) s.setLayoutMenuOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
}
