import { useEffect, useState } from "react";
import { Glyph } from "@/lib/glyphs";
import { ipc, safeIpc } from "@/lib/ipc";
import { useStore } from "@/state/store";

export function StatusBar() {
  const workdir = useStore((s) => s.workdir);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);
  const [branch, setBranch] = useState("—");

  useEffect(() => {
    if (!workdir) return;
    safeIpc(() => ipc.gitBranch(workdir), "—").then(setBranch);
  }, [workdir]);

  return (
    <div className="status-bar">
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Glyph name="branch" size={11} color="var(--ink-soft)" />
        {branch}
      </span>
      <span>UTF-8</span>
      <span style={{ flex: 1 }} />
      <span style={{ cursor: "pointer" }} onClick={() => setPaletteOpen(true)}>
        ⌘K palette
      </span>
      <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <Glyph name="sparkle" size={10} color="var(--accent)" />
        claude ready
      </span>
    </div>
  );
}
