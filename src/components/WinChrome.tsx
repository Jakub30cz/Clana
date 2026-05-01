import { ReactNode } from "react";
import { LayoutSwitcher } from "./LayoutSwitcher";
import { useStore } from "@/state/store";

interface Props {
  title?: string;
  subtitle?: string;
  children: ReactNode;
}

export function WinChrome({ title = "clauna", subtitle, children }: Props) {
  const layout = useStore((s) => s.layout);
  const sub = subtitle ?? layoutSubtitle(layout);

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
        }}
      >
        {/* macOS overlay leaves space for traffic lights via padding */}
        <div className="mac-traffic-pad" />
        <div style={{
          flex: 1, textAlign: "center",
          fontFamily: "var(--hand)", fontSize: 13,
          color: "var(--ink-soft)",
          pointerEvents: "none",
        }}>
          <span style={{ fontWeight: 600, color: "var(--ink)" }}>{title}</span>
          {sub && <span style={{ opacity: 0.7 }}> — {sub}</span>}
        </div>
        <LayoutSwitcher />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

function layoutSubtitle(layout: string): string {
  switch (layout) {
    case "classic":
      return "L-shape";
    case "zen":
      return "zen mode";
    case "tiled":
      return "tiled · 4 panes";
    case "claude-dock":
      return "claude-first";
    default:
      return "";
  }
}
