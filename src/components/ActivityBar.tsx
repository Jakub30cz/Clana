import clsx from "clsx";
import { Glyph, GlyphName } from "@/lib/glyphs";

export interface ActivityItem {
  id: string;
  icon: GlyphName;
  label: string;
}

interface Props {
  items: ActivityItem[];
  active: string | null;
  onChange: (id: string | null) => void;
  vertical?: boolean;
}

export function ActivityBar({ items, active, onChange, vertical = true }: Props) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: vertical ? "column" : "row",
        alignItems: "center",
        gap: 8,
        padding: 8,
        background: "var(--paper-2)",
        borderRight: vertical ? "1.5px solid var(--rule)" : "none",
        borderBottom: vertical ? "none" : "1.5px solid var(--rule)",
        flexShrink: 0,
      }}
    >
      {items.map((it) => (
        <div
          key={it.id}
          className={clsx("act-icon", { active: active === it.id })}
          title={it.label}
          onClick={() => onChange(active === it.id ? null : it.id)}
        >
          <Glyph name={it.icon} size={18} />
        </div>
      ))}
      <div style={{ flex: 1 }} />
    </div>
  );
}
