import { useEffect, useRef } from "react";
import { Glyph } from "@/lib/glyphs";
import { useStore } from "@/state/store";
import { LAYOUT_LABELS, LayoutMode } from "@/state/layouts";

const LAYOUTS: LayoutMode[] = ["classic", "zen", "tiled", "claude-dock"];

export function LayoutSwitcher() {
  const layout = useStore((s) => s.layout);
  const open = useStore((s) => s.layoutMenuOpen);
  const setLayout = useStore((s) => s.setLayout);
  const setOpen = useStore((s) => s.setLayoutMenuOpen);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onClick);
    return () => window.removeEventListener("mousedown", onClick);
  }, [open, setOpen]);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="sketch-btn"
        onClick={() => setOpen(!open)}
        title="Switch layout"
        style={{ display: "flex", alignItems: "center", gap: 6 }}
      >
        <Glyph name="layers" size={12} />
        <span>{shortName(layout)}</span>
        <Glyph name="chevron-d" size={10} />
      </button>
      {open && (
        <div
          className="sketch-frame"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            width: 240,
            zIndex: 40,
            padding: 6,
            background: "var(--paper)",
          }}
        >
          {LAYOUTS.map((m, i) => (
            <div
              key={m}
              className={"side-item" + (m === layout ? " active" : "")}
              style={{ padding: "8px 10px", fontSize: 13, gap: 10 }}
              onClick={() => {
                setLayout(m);
                setOpen(false);
              }}
            >
              <span style={{ flex: 1 }}>{LAYOUT_LABELS[m]}</span>
              <span className="kbd">⌘{i + 1}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function shortName(m: LayoutMode): string {
  switch (m) {
    case "classic":
      return "Classic";
    case "zen":
      return "Zen";
    case "tiled":
      return "Tiled";
    case "claude-dock":
      return "Claude dock";
  }
}
