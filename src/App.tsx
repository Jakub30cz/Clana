import { useEffect } from "react";
import { WinChrome } from "@/components/WinChrome";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { LayoutClassic } from "@/layouts/LayoutClassic";
import { LayoutZen } from "@/layouts/LayoutZen";
import { LayoutTiled } from "@/layouts/LayoutTiled";
import { ACCENTS, ACCENT_SOFT_DARK, ACCENT_SOFT_LIGHT, useStore } from "@/state/store";
import { useGlobalKeymap } from "@/lib/keymap";
import { useMenuEvents } from "@/lib/menuEvents";
import { useFolderDrop } from "@/lib/dragDrop";
import { DragGhost } from "@/components/DragGhost";
import { activeTerminalIds, disposeTerminal } from "@/lib/terminalRegistry";
import { listLeaves } from "@/lib/paneTree";

export default function App() {
  const layout = useStore((s) => s.layout);
  const accent = useStore((s) => s.accent);
  const theme = useStore((s) => s.theme);
  const mode = useStore((s) => s.mode);
  const workdir = useStore((s) => s.workdir);
  const workspace = useStore((s) => s.workspace);
  const hasFolder = Boolean(workdir || workspace);

  useGlobalKeymap();
  useMenuEvents();
  useFolderDrop();

  // Dispose terminal entries whose pane has truly disappeared from the tree.
  // Pane reorders don't fire this — only user-initiated close.
  useEffect(() => {
    return useStore.subscribe((state, prev) => {
      if (state.tree === prev.tree) return;
      const live = new Set(listLeaves(state.tree).map((l) => l.id));
      for (const id of activeTerminalIds()) {
        if (!live.has(id)) disposeTerminal(id);
      }
    });
  }, []);

  // Apply theme + mode on document root.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  // Accent override (independent of theme), mode-aware soft pair.
  useEffect(() => {
    const update = () => {
      const sysDark =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-color-scheme: dark)").matches;
      const isDark = mode === "dark" || (mode === "auto" && sysDark);
      document.documentElement.style.setProperty("--accent", ACCENTS[accent]);
      document.documentElement.style.setProperty(
        "--accent-soft",
        (isDark ? ACCENT_SOFT_DARK : ACCENT_SOFT_LIGHT)[accent]
      );
    };
    update();
    if (mode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
  }, [accent, mode]);

  return (
    <WinChrome>
      <CommandPalette />
      {!hasFolder ? (
        <WelcomeScreen />
      ) : (
        <>
          {layout === "classic" && <LayoutClassic />}
          {layout === "zen" && <LayoutZen />}
          {layout === "tiled" && <LayoutTiled />}
        </>
      )}
      <StatusBar />
      <DragGhost />
    </WinChrome>
  );
}
