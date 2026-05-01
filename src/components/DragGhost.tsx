import { useDragState } from "@/lib/dragManager";
import { useStore } from "@/state/store";
import { findLeafBy } from "@/lib/paneTree";
import { Glyph, GlyphName } from "@/lib/glyphs";

/** Floating chip that follows the cursor while a manual drag is active.
 *  Mounted once at the App level, displays whatever's currently being
 *  dragged (file path / pane name). pointer-events: none so it never
 *  interferes with hit-testing under the cursor. */
export function DragGhost() {
  const drag = useDragState();
  const tree = useStore((s) => s.tree);

  if (!drag.active || !drag.payload) return null;

  let label = "";
  let icon: GlyphName = "doc";
  if (drag.payload.type === "file") {
    label = drag.payload.name;
    icon = "doc";
  } else {
    const paneId = drag.payload.paneId;
    const leaf = findLeafBy(tree, (l) => l.id === paneId);
    label = leaf?.name ?? "pane";
    icon = leaf?.kind === "claude" ? "sparkle" : leaf?.kind === "shell" ? "terminal" : "doc";
  }

  return (
    <div
      style={{
        position: "fixed",
        left: drag.x + 14,
        top: drag.y + 14,
        zIndex: 1000,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "4px 8px",
        background: "var(--paper-2)",
        border: "1.5px solid var(--accent)",
        borderRadius: 6,
        boxShadow: "2px 2px 0 var(--rule)",
        fontFamily: "var(--font-hand)",
        fontSize: 12,
        color: "var(--ink)",
        whiteSpace: "nowrap",
        maxWidth: 240,
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
    >
      <Glyph name={icon} size={12} />
      <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>
  );
}
