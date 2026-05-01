import { useRef } from "react";
import clsx from "clsx";
import { Glyph } from "@/lib/glyphs";
import { PaneNode, PaneLeaf } from "@/lib/paneTree";
import { useStore } from "@/state/store";
import { Resizer } from "../Resizer";
import { EditorPane } from "./EditorPane";
import { TerminalPane } from "./TerminalPane";

interface Props {
  pane: PaneNode;
  splitPath?: number[];
}

export function PaneShell({ pane, splitPath = [] }: Props) {
  const setSplitRatio = useStore((s) => s.setSplitRatio);
  const containerRef = useRef<HTMLDivElement | null>(null);

  if (pane.type === "split") {
    const isH = pane.dir === "h";
    const aFlex = pane.ratio;
    const bFlex = 1 - pane.ratio;

    return (
      <div
        ref={containerRef}
        style={{
          display: "flex",
          flexDirection: isH ? "row" : "column",
          flex: 1,
          minWidth: 0,
          minHeight: 0,
        }}
      >
        <div style={{ flex: aFlex, minWidth: 0, minHeight: 0, display: "flex" }}>
          <PaneShell pane={pane.a} splitPath={[...splitPath, 0]} />
        </div>
        <Resizer
          dir={isH ? "h" : "v"}
          containerRef={containerRef}
          onChange={(r) => setSplitRatio(splitPath, r)}
        />
        <div style={{ flex: bFlex, minWidth: 0, minHeight: 0, display: "flex" }}>
          <PaneShell pane={pane.b} splitPath={[...splitPath, 1]} />
        </div>
      </div>
    );
  }

  return <Leaf pane={pane} />;
}

function Leaf({ pane }: { pane: PaneLeaf }) {
  const activeId = useStore((s) => s.activePaneId);
  const setActivePane = useStore((s) => s.setActivePane);
  const closePane = useStore((s) => s.closePane);
  const splitPane = useStore((s) => s.splitPane);
  const isActive = pane.id === activeId;

  return (
    <div
      onClick={() => setActivePane(pane.id)}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        outline: isActive ? "2px solid var(--accent)" : "1px solid rgba(31,29,26,0.2)",
        outlineOffset: -1,
        position: "relative",
        background: "var(--paper)",
      }}
    >
      <PaneHeader
        pane={pane}
        active={isActive}
        onClose={() => closePane(pane.id)}
        onSplit={(d) => splitPane(pane.id, d, pane.kind)}
      />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {pane.kind === "editor" && <EditorPane pane={pane} />}
        {pane.kind === "shell" && <TerminalPane pane={pane} kind="shell" />}
        {pane.kind === "claude" && <TerminalPane pane={pane} kind="claude" />}
      </div>
    </div>
  );
}

interface HeaderProps {
  pane: PaneLeaf;
  active: boolean;
  onClose: () => void;
  onSplit: (d: "h" | "v") => void;
}

function PaneHeader({ pane, active, onClose, onSplit }: HeaderProps) {
  const ic = pane.kind === "editor" ? "doc" : pane.kind === "claude" ? "sparkle" : "terminal";
  const accent = pane.kind === "claude";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        background: active ? "var(--paper-2)" : "rgba(239,233,218,0.6)",
        borderBottom: "1.5px solid var(--rule)",
        flexShrink: 0,
        fontFamily: "var(--hand)",
        fontSize: 12,
      }}
    >
      <Glyph name={ic} size={12} color={accent ? "var(--accent)" : "var(--ink-soft)"} />
      <span style={{ fontWeight: 700, color: accent ? "var(--accent)" : "var(--ink)" }}>{pane.name}</span>
      <span style={{ flex: 1 }} />
      <div
        className={clsx("act-icon")}
        style={{ width: 22, height: 22 }}
        onClick={(e) => {
          e.stopPropagation();
          onSplit("h");
        }}
        title="split right"
      >
        <Glyph name="split-h" size={11} />
      </div>
      <div
        className="act-icon"
        style={{ width: 22, height: 22 }}
        onClick={(e) => {
          e.stopPropagation();
          onSplit("v");
        }}
        title="split down"
      >
        <Glyph name="split-v" size={11} />
      </div>
      <div
        className="act-icon"
        style={{ width: 22, height: 22 }}
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        title="close"
      >
        <Glyph name="x" size={11} />
      </div>
    </div>
  );
}
