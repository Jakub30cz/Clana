import { useEffect, useRef } from "react";
import { SlimRail } from "@/components/Sidebar";
import { PaneShell } from "@/components/panes/PaneShell";
import { Glyph } from "@/lib/glyphs";
import { useStore } from "@/state/store";
import { FileTree } from "@/components/panels/FileTree";
import { GitPanel } from "@/components/panels/GitPanel";
import { SearchPanel } from "@/components/panels/SearchPanel";
import { SettingsPanel } from "@/components/panels/SettingsPanel";

const LABELS = { files: "Files", git: "Git", search: "Search", settings: "Settings" } as const;

export function LayoutZen() {
  const tree = useStore((s) => s.tree);
  const panel = useStore((s) => s.sidePanel);
  const setPanel = useStore((s) => s.setSidePanel);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!panel) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setPanel(null);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [panel, setPanel]);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
      <SlimRail />
      {panel && (
        <div
          ref={ref}
          className="sketch-frame"
          style={{
            position: "absolute",
            left: 56,
            top: 12,
            bottom: 12,
            width: 280,
            zIndex: 15,
            display: "flex",
            flexDirection: "column",
            background: "var(--paper)",
            boxShadow: "4px 4px 0 var(--rule)",
          }}
        >
          <div
            style={{
              padding: "8px 10px",
              fontFamily: "var(--display)",
              fontSize: 16,
              fontWeight: 700,
              borderBottom: "1.5px solid var(--rule)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <span style={{ flex: 1, textTransform: "lowercase" }}>{panel ? LABELS[panel] : ""}</span>
            <div className="act-icon" style={{ width: 22, height: 22 }} onClick={() => setPanel(null)}>
              <Glyph name="x" size={11} />
            </div>
          </div>
          <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
            {panel === "files" && <FileTree />}
            {panel === "git" && <GitPanel />}
            {panel === "search" && <SearchPanel />}
            {panel === "settings" && <SettingsPanel />}
          </div>
        </div>
      )}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <PaneShell pane={tree} />
        </div>
        {tree.type === "leaf" && <Hints />}
      </div>
    </div>
  );
}

function Hints() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: 24,
        left: "50%",
        transform: "translateX(-50%)",
        fontFamily: "var(--hand)",
        fontSize: 13,
        color: "var(--ink-faint)",
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "6px 14px",
        background: "var(--paper-2)",
        border: "1.5px dashed var(--rule)",
        borderRadius: 6,
      }}
    >
      <span><span className="kbd">⌘K</span> palette</span>
      <span><span className="kbd">⌘J</span> claude</span>
      <span><span className="kbd">⌃`</span> terminal</span>
      <span><span className="kbd">⌘\\</span> split</span>
    </div>
  );
}
