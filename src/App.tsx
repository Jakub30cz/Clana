import { useEffect } from "react";
import { WinChrome } from "@/components/WinChrome";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { LayoutClassic } from "@/layouts/LayoutClassic";
import { LayoutZen } from "@/layouts/LayoutZen";
import { LayoutTiled } from "@/layouts/LayoutTiled";
import { LayoutClaudeDock } from "@/layouts/LayoutClaudeDock";
import { ACCENTS, ACCENT_SOFT, useStore } from "@/state/store";
import { useGlobalKeymap } from "@/lib/keymap";
import { safeIpc } from "@/lib/ipc";

export default function App() {
  const layout = useStore((s) => s.layout);
  const accent = useStore((s) => s.accent);
  const workdir = useStore((s) => s.workdir);
  const setWorkdir = useStore((s) => s.setWorkdir);

  useGlobalKeymap();

  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ACCENTS[accent]);
    document.documentElement.style.setProperty("--accent-soft", ACCENT_SOFT[accent]);
  }, [accent]);

  useEffect(() => {
    if (workdir) return;
    safeIpc(async () => {
      const { homeDir } = await import("@tauri-apps/api/path");
      return homeDir();
    }, "").then((dir) => {
      if (dir) setWorkdir(dir);
    });
  }, [workdir, setWorkdir]);

  return (
    <WinChrome>
      <CommandPalette />
      {layout === "classic" && <LayoutClassic />}
      {layout === "zen" && <LayoutZen />}
      {layout === "tiled" && <LayoutTiled />}
      {layout === "claude-dock" && <LayoutClaudeDock />}
      <StatusBar />
    </WinChrome>
  );
}
