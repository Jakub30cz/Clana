import clsx from "clsx";
import { Glyph, GlyphName } from "@/lib/glyphs";
import { useStore } from "@/state/store";

interface Action {
  id: "shell" | "claude" | "split-h" | "split-v";
  icon: GlyphName;
  label: string;
  hint: string;
  accent?: boolean;
}

const ACTIONS: Action[] = [
  { id: "shell", icon: "terminal", label: "Terminal", hint: "⌃`" },
  { id: "claude", icon: "sparkle", label: "Claude", hint: "⌘J", accent: true },
  { id: "split-h", icon: "split-h", label: "Split right", hint: "⌘\\" },
  { id: "split-v", icon: "split-v", label: "Split down", hint: "⌘⇧\\" },
];

/** Compact toolbar that lives in the title bar. Each button mirrors a key
 *  shortcut and dispatches into the active pane. */
export function PaneToolbar() {
  const splitPane = useStore((s) => s.splitPane);
  const workdir = useStore((s) => s.workdir);
  const disabled = !workdir;

  const trigger = (a: Action) => {
    if (disabled) return;
    const active = useStore.getState().activePaneId;
    if (a.id === "split-h") splitPane(active, "h", "editor");
    else if (a.id === "split-v") splitPane(active, "v", "editor");
    else splitPane(active, a.id === "claude" ? "h" : "v", a.id);
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      {ACTIONS.map((a) => (
        <button
          key={a.id}
          className={clsx("pane-toolbar-btn", { accent: a.accent })}
          onClick={() => trigger(a)}
          disabled={disabled}
          title={`${a.label} — ${a.hint}`}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 26,
            height: 24,
            border: "1.5px solid var(--rule)",
            borderRadius: "var(--btn-radius, 5px)",
            background: a.accent ? "var(--accent-soft)" : "var(--paper)",
            color: a.accent ? "var(--accent)" : "var(--ink-soft)",
            cursor: disabled ? "default" : "pointer",
            opacity: disabled ? 0.4 : 1,
            padding: 0,
            transform: "none",
            boxShadow: "var(--btn-shadow, none)",
          }}
        >
          <Glyph name={a.icon} size={13} />
        </button>
      ))}
    </div>
  );
}
