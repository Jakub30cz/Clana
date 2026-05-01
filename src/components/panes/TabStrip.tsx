import clsx from "clsx";
import { PaneLeaf } from "@/lib/paneTree";
import { useStore } from "@/state/store";

interface Props {
  pane: PaneLeaf;
}

function basename(p: string): string {
  return p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;
}

export function TabStrip({ pane }: Props) {
  const openFiles = useStore((s) => s.openFiles);
  const setActiveTab = useStore((s) => s.setActiveTab);
  const closeFileInPane = useStore((s) => s.closeFileInPane);
  const tabs = pane.tabs ?? [];

  if (tabs.length === 0) {
    return (
      <div
        style={{
          padding: "6px 10px",
          fontSize: 12,
          fontFamily: "var(--hand)",
          color: "var(--ink-faint)",
          background: "var(--paper-2)",
          borderBottom: "1px dashed var(--rule)",
          flexShrink: 0,
        }}
      >
        welcome — open a file from the sidebar
      </div>
    );
  }

  return (
    <div
      className="no-scroll-chrome"
      style={{
        display: "flex",
        alignItems: "flex-end",
        gap: 4,
        padding: "6px 6px 0",
        background: "var(--paper-2)",
        borderBottom: "1px dashed var(--rule)",
        overflowX: "auto",
        overflowY: "hidden",
        flexShrink: 0,
        minHeight: 32,
      }}
    >
      {tabs.map((path) => {
        const f = openFiles[path];
        const active = path === pane.activeTab;
        const name = f?.name ?? basename(path);
        return (
          <div
            key={path}
            className={clsx("sketch-tab", { active })}
            onClick={(e) => {
              e.stopPropagation();
              setActiveTab(pane.id, path);
            }}
            onMouseDown={(e) => {
              if (e.button === 1) {
                e.preventDefault();
                e.stopPropagation();
                closeFileInPane(pane.id, path);
              }
            }}
            title={path}
            style={{ fontSize: 12, padding: "4px 8px 4px 10px" }}
          >
            <span style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {name}
            </span>
            {f?.dirty && <span style={{ color: "var(--accent)", marginLeft: 2 }}>●</span>}
            <span
              className="x"
              onClick={(e) => {
                e.stopPropagation();
                closeFileInPane(pane.id, path);
              }}
              title="close"
            >
              ×
            </span>
          </div>
        );
      })}
    </div>
  );
}
