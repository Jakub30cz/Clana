import { Glyph, GlyphName } from "@/lib/glyphs";
import { useStore } from "@/state/store";

interface FabItem {
  id: "shell" | "claude" | "split-h" | "split-v";
  icon: GlyphName;
  label: string;
  hint: string;
  accent?: boolean;
}

const ITEMS: FabItem[] = [
  { id: "shell", icon: "terminal", label: "Terminal", hint: "⌃`" },
  { id: "claude", icon: "sparkle", label: "Claude", hint: "⌘J", accent: true },
  { id: "split-h", icon: "split-h", label: "Split →", hint: "⌘\\" },
  { id: "split-v", icon: "split-v", label: "Split ↓", hint: "⌘⇧\\" },
];

export function SplitPaletteFAB() {
  const splitPane = useStore((s) => s.splitPane);

  const trigger = (it: FabItem) => {
    const active = useStore.getState().activePaneId;
    if (it.id === "split-h") splitPane(active, "h", "editor");
    else if (it.id === "split-v") splitPane(active, "v", "editor");
    else splitPane(active, "h", it.id);
  };

  return (
    <div
      style={{
        position: "absolute",
        right: 16,
        bottom: 32,
        zIndex: 20,
        display: "flex",
        flexDirection: "column",
        gap: 6,
      }}
    >
      {ITEMS.map((it, i) => (
        <div
          key={it.id}
          className="sketch-frame"
          onClick={() => trigger(it)}
          style={{
            padding: "6px 10px",
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: it.accent ? "var(--accent-soft)" : "var(--paper)",
            cursor: "grab",
            fontFamily: "var(--hand)",
            fontSize: 12,
            transform: `rotate(${i % 2 === 0 ? -0.3 : 0.3}deg)`,
            minWidth: 110,
          }}
          title={`add — ${it.hint}`}
        >
          <Glyph name={it.icon} size={14} color={it.accent ? "var(--accent)" : "var(--ink)"} />
          <span style={{ flex: 1, fontWeight: it.accent ? 700 : 500 }}>{it.label}</span>
          <span className="kbd">{it.hint}</span>
        </div>
      ))}
    </div>
  );
}
