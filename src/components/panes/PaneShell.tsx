import { useRef, useState } from "react";
import clsx from "clsx";
import { Glyph } from "@/lib/glyphs";
import {
  PaneNode,
  PaneLeaf,
  DropZone,
  listLeaves,
} from "@/lib/paneTree";
import { useStore } from "@/state/store";
import { Resizer } from "../Resizer";
import { EditorPane } from "./EditorPane";
import { TerminalPane } from "./TerminalPane";
import { ContextMenu, ContextMenuItem } from "@/components/ContextMenu";
import { beginDrag, useDragState } from "@/lib/dragManager";

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
  const drag = useDragState();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);

  // What overlay does this pane show during the active drag?
  // - file drag over us       → dashed outline
  // - pane drag over us, !self → drop indicator showing target zone
  const showFileOverlay =
    drag.active && drag.payload?.type === "file" && drag.hoverPaneId === pane.id;
  const paneDragOverHere =
    drag.active &&
    drag.payload?.type === "pane" &&
    drag.payload.paneId !== pane.id &&
    drag.hoverPaneId === pane.id;

  return (
    <div
      data-pane-id={pane.id}
      onMouseDown={() => setActivePane(pane.id)}
      style={{
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        outline: isActive
          ? "2px solid var(--accent)"
          : "1px solid rgb(var(--decor-rgb) / 0.2)",
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
        onContextMenu={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
      />
      <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column" }}>
        {pane.kind === "editor" && <EditorPane pane={pane} />}
        {pane.kind === "shell" && <TerminalPane pane={pane} kind="shell" />}
        {pane.kind === "claude" && <TerminalPane pane={pane} kind="claude" />}
      </div>

      {showFileOverlay && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            border: "3px dashed var(--accent)",
            background: "var(--accent-soft)",
            opacity: 0.45,
            zIndex: 10,
          }}
        />
      )}

      {paneDragOverHere && drag.hoverZone && (
        <DropIndicator zone={drag.hoverZone} />
      )}

      {menu && (
        <PaneContextMenu
          pane={pane}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

/** Single highlighted region showing where the dragged pane will land. */
function DropIndicator({ zone }: { zone: DropZone }) {
  const styles: Record<DropZone, React.CSSProperties> = {
    top: { top: 0, left: 0, right: 0, height: "50%" },
    bottom: { bottom: 0, left: 0, right: 0, height: "50%" },
    left: { top: 0, bottom: 0, left: 0, width: "50%" },
    right: { top: 0, bottom: 0, right: 0, width: "50%" },
    center: { top: 0, left: 0, right: 0, bottom: 0 },
  };
  return (
    <div
      style={{
        position: "absolute",
        background: "var(--accent-soft)",
        outline: "2px solid var(--accent)",
        outlineOffset: -2,
        opacity: 0.55,
        pointerEvents: "none",
        zIndex: 12,
        transition: "all 80ms ease",
        ...styles[zone],
      }}
    />
  );
}

function PaneContextMenu({
  pane,
  x,
  y,
  onClose,
}: {
  pane: PaneLeaf;
  x: number;
  y: number;
  onClose: () => void;
}) {
  const tree = useStore((s) => s.tree);
  const movePaneToEdge = useStore((s) => s.movePaneToEdge);
  const movePane = useStore((s) => s.movePane);
  const closePane = useStore((s) => s.closePane);

  const others = listLeaves(tree).filter((l) => l.id !== pane.id);

  const sep = (id: string): ContextMenuItem => ({
    id,
    label: "—",
    disabled: true,
    onClick: () => {},
  });

  const items: ContextMenuItem[] = [
    {
      id: "to-top",
      label: "Move to Top",
      icon: "split-v",
      onClick: () => movePaneToEdge(pane.id, "top"),
    },
    {
      id: "to-bottom",
      label: "Move to Bottom",
      icon: "split-v",
      onClick: () => movePaneToEdge(pane.id, "bottom"),
    },
    {
      id: "to-left",
      label: "Move to Left",
      icon: "split-h",
      onClick: () => movePaneToEdge(pane.id, "left"),
    },
    {
      id: "to-right",
      label: "Move to Right",
      icon: "split-h",
      onClick: () => movePaneToEdge(pane.id, "right"),
    },
  ];

  if (others.length > 0) {
    items.push(sep("sep-swap"));
    for (const o of others) {
      items.push({
        id: `swap-${o.id}`,
        label: `Swap with: ${o.name}`,
        icon: leafIcon(o),
        onClick: () => movePane(pane.id, o.id, "center"),
      });
    }
  }

  items.push(sep("sep-close"));
  items.push({
    id: "close",
    label: "Close pane",
    danger: true,
    onClick: () => closePane(pane.id),
  });

  return <ContextMenu x={x} y={y} items={items} onClose={onClose} />;
}

function leafIcon(l: PaneLeaf): "doc" | "sparkle" | "terminal" {
  return l.kind === "editor" ? "doc" : l.kind === "claude" ? "sparkle" : "terminal";
}

interface HeaderProps {
  pane: PaneLeaf;
  active: boolean;
  onClose: () => void;
  onSplit: (d: "h" | "v") => void;
  onContextMenu: (e: React.MouseEvent) => void;
}

function PaneHeader({ pane, active, onClose, onSplit, onContextMenu }: HeaderProps) {
  const ic = pane.kind === "editor" ? "doc" : pane.kind === "claude" ? "sparkle" : "terminal";
  const accent = pane.kind === "claude";
  const setActivePane = useStore((s) => s.setActivePane);

  return (
    <div
      onMouseDown={(e) => {
        // Skip when the user clicks an act-icon (split/close): those have
        // their own onClick. Drag from the title area only.
        if ((e.target as HTMLElement).closest(".act-icon")) return;
        beginDrag(
          e,
          { type: "pane", paneId: pane.id },
          () => setActivePane(pane.id),
        );
      }}
      onContextMenu={onContextMenu}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 8px",
        background: active ? "var(--paper-2)" : "var(--paper)",
        opacity: active ? 1 : 0.7,
        borderBottom: "1.5px solid var(--rule)",
        flexShrink: 0,
        fontFamily: "var(--hand)",
        fontSize: 12,
        cursor: "grab",
        userSelect: "none",
      }}
    >
      <Glyph name={ic} size={12} color={accent ? "var(--accent)" : "var(--ink-soft)"} />
      <span style={{ fontWeight: 700, color: accent ? "var(--accent)" : "var(--ink)" }}>{pane.name}</span>
      <span style={{ flex: 1 }} />
      <div
        className={clsx("act-icon")}
        style={{ width: 22, height: 22 }}
        onMouseDown={(e) => e.stopPropagation()}
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
        onMouseDown={(e) => e.stopPropagation()}
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
        onMouseDown={(e) => e.stopPropagation()}
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
