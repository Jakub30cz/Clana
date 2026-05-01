import { useEffect } from "react";
import { WinChrome } from "@/components/WinChrome";
import { StatusBar } from "@/components/StatusBar";
import { CommandPalette } from "@/components/CommandPalette";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { LayoutClassic } from "@/layouts/LayoutClassic";
import { LayoutZen } from "@/layouts/LayoutZen";
import { LayoutTiled } from "@/layouts/LayoutTiled";
import { LayoutClaudeDock } from "@/layouts/LayoutClaudeDock";
import { ACCENTS, ACCENT_SOFT, useStore } from "@/state/store";
import { useGlobalKeymap } from "@/lib/keymap";

export default function App() {
  const layout = useStore((s) => s.layout);
  const accent = useStore((s) => s.accent);
  const theme = useStore((s) => s.theme);
  const mode = useStore((s) => s.mode);
  const workdir = useStore((s) => s.workdir);

  useGlobalKeymap();

  // Apply theme + mode on document root.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.dataset.mode = mode;
  }, [theme, mode]);

  // Accent override (independent of theme).
  useEffect(() => {
    document.documentElement.style.setProperty("--accent", ACCENTS[accent]);
    document.documentElement.style.setProperty("--accent-soft", ACCENT_SOFT[accent]);
  }, [accent]);

  return (
    <WinChrome>
      <CommandPalette />
      {!workdir ? (
        <WelcomeScreen />
      ) : (
        <>
          {layout === "classic" && <LayoutClassic />}
          {layout === "zen" && <LayoutZen />}
          {layout === "tiled" && <LayoutTiled />}
          {layout === "claude-dock" && <LayoutClaudeDock />}
        </>
      )}
      <StatusBar />
    </WinChrome>
  );
}
