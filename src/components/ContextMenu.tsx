import { useEffect, useRef } from "react";
import { Glyph, GlyphName } from "@/lib/glyphs";

export interface ContextMenuItem {
  id: string;
  label: string;
  icon?: GlyphName;
  hint?: string;
  /** mark item as visually destructive (delete) */
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

/** Cursor-anchored popover. Closes on outside-click, Escape, or item click. */
export function ContextMenu({ x, y, items, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("mousedown", onMouseDown, true);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [onClose]);

  // Clamp to viewport so the menu doesn't open off-screen.
  const left = Math.min(x, window.innerWidth - 220);
  const top = Math.min(y, window.innerHeight - items.length * 30 - 8);

  return (
    <div
      ref={ref}
      className="sketch-frame"
      style={{
        position: "fixed",
        left,
        top,
        minWidth: 200,
        background: "var(--paper)",
        zIndex: 50,
        padding: 4,
        transform: "none",
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it) => (
        <div
          key={it.id}
          className="side-item"
          style={{
            padding: "6px 10px",
            fontSize: 13,
            gap: 10,
            opacity: it.disabled ? 0.4 : 1,
            color: it.danger ? "var(--accent)" : "var(--ink)",
            pointerEvents: it.disabled ? "none" : "auto",
          }}
          onClick={() => {
            if (it.disabled) return;
            it.onClick();
            onClose();
          }}
        >
          {it.icon && <Glyph name={it.icon} size={12} />}
          <span style={{ flex: 1 }}>{it.label}</span>
          {it.hint && <span className="kbd">{it.hint}</span>}
        </div>
      ))}
    </div>
  );
}
