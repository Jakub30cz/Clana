import { ActivityBar, ActivityItem } from "./ActivityBar";
import { FileTree } from "./panels/FileTree";
import { GitPanel } from "./panels/GitPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { useStore } from "@/state/store";

const ITEMS: ActivityItem[] = [
  { id: "files", icon: "files", label: "Files" },
  { id: "search", icon: "search", label: "Search" },
  { id: "git", icon: "git", label: "Git" },
  { id: "settings", icon: "settings", label: "Settings" },
];

interface Props {
  width?: number;
  side?: "left" | "right";
}

export function Sidebar({ width = 240, side = "left" }: Props) {
  const panel = useStore((s) => s.sidePanel);
  const setPanel = useStore((s) => s.setSidePanel);

  const activity = (
    <ActivityBar
      items={ITEMS}
      active={panel}
      onChange={(id) => setPanel(id as typeof panel)}
    />
  );

  const body = panel ? (
    <div
      style={{
        width,
        background: "var(--paper)",
        borderRight: side === "left" ? "1.5px solid var(--rule)" : "none",
        borderLeft: side === "right" ? "1.5px solid var(--rule)" : "none",
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        minHeight: 0,
      }}
    >
      <div
        style={{
          padding: "8px 10px",
          fontFamily: "var(--display)",
          fontSize: 16,
          fontWeight: 700,
          borderBottom: "1.5px solid var(--rule)",
          textTransform: "lowercase",
          letterSpacing: 0.5,
        }}
      >
        {ITEMS.find((i) => i.id === panel)?.label}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {panel === "files" && <FileTree />}
        {panel === "git" && <GitPanel />}
        {panel === "search" && <SearchPanel />}
        {panel === "settings" && <SettingsPanel />}
      </div>
    </div>
  ) : null;

  return side === "right" ? (
    <>
      {body}
      {activity}
    </>
  ) : (
    <>
      {activity}
      {body}
    </>
  );
}

export function SlimRail() {
  const panel = useStore((s) => s.sidePanel);
  const setPanel = useStore((s) => s.setSidePanel);
  const setPaletteOpen = useStore((s) => s.setPaletteOpen);

  return (
    <div
      style={{
        width: 44,
        background: "var(--paper-2)",
        borderRight: "1.5px solid var(--rule)",
        display: "flex",
        flexDirection: "column",
        gap: 8,
        padding: 6,
        flexShrink: 0,
      }}
    >
      <ActivityBar
        items={ITEMS}
        active={panel}
        onChange={(id) => setPanel(id as typeof panel)}
      />
      <div style={{ flex: 1 }} />
      <div
        className="act-icon"
        style={{ background: "var(--accent)", color: "var(--ink)", margin: "0 auto" }}
        onClick={() => setPaletteOpen(true)}
        title="command palette"
      >
        <span style={{ fontFamily: "var(--mono)", fontSize: 11, fontWeight: 700 }}>⌘K</span>
      </div>
    </div>
  );
}

export const SIDEBAR_ITEMS = ITEMS;
