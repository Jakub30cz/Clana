import { ReactNode } from "react";
import { LayoutSwitcher } from "./LayoutSwitcher";
import { PaneToolbar } from "./PaneToolbar";
import { useStore } from "@/state/store";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function WinChrome({ title = "clana", subtitle, children }: Props) {
  const layout = useStore((s) => s.layout);
  const workdir = useStore((s) => s.workdir);
  const workspace = useStore((s) => s.workspace);
  const folderLabel = workspace
    ? workspace.name || "Untitled Workspace"
    : workdir
      ? basename(workdir)
      : "";
  const sub = subtitle ?? [folderLabel, layoutSubtitle(layout)].filter(Boolean).join(" · ");

  return (
    <div className="sketch-frame" style={{
      width: "100%", height: "100%",
      display: "flex", flexDirection: "column",
      overflow: "hidden",
      background: "var(--paper)",
      borderRadius: 0,
      border: "none",
      boxShadow: "none",
    }}>
      <div
        data-tauri-drag-region
        style={{
          display: "flex", alignItems: "center",
          padding: "6px 12px",
          borderBottom: "1.5px solid var(--rule)",
          background: "var(--paper-2)",
          flexShrink: 0, gap: 12,
          minHeight: 32,
          position: "relative",
          zIndex: 10,
        }}
      >
        {/* macOS overlay leaves space for traffic lights via padding */}
        <div className="mac-traffic-pad" />
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "var(--font-hand)", fontSize: 13,
          color: "var(--ink-soft)",
          pointerEvents: "none",
        }}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{title}</span>
          {sub && <span style={{ opacity: 0.7 }}> — {sub}</span>}
        </div>
        {/* Drag-region opt-out: child elements inherit data-tauri-drag-region
            from the title bar parent, which on macOS Overlay style intercepts
            clicks as drag starts. These wrappers restore normal click behavior. */}
        <div data-tauri-drag-region="false" style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <PaneToolbar />
        </div>
        <div data-tauri-drag-region="false" style={{ display: "flex", alignItems: "center" }}>
          <LayoutSwitcher />
        </div>
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

function basename(p: string): string {
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

function layoutSubtitle(layout: string): string {
  switch (layout) {
    case "classic":
      return "L-shape";
    case "zen":
      return "zen mode";
    case "tiled":
      return "tiled · 4 panes";
    default:
      return "";
  }
}
