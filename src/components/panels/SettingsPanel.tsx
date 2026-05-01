import { ACCENTS, AccentName, useStore } from "@/state/store";

const ACCENT_NAMES: AccentName[] = ["amber", "teal", "rose", "green", "violet"];

export function SettingsPanel() {
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);

  return (
    <div style={{ padding: "10px 12px", fontFamily: "var(--hand)", fontSize: 13, overflow: "auto" }}>
      <div className="hand-title" style={{ fontSize: 18, marginBottom: 8 }}>Settings</div>

      <Group label="Accent">
        <div style={{ display: "flex", gap: 8 }}>
          {ACCENT_NAMES.map((a) => (
            <button
              key={a}
              onClick={() => setAccent(a)}
              title={a}
              style={{
                width: 22, height: 22,
                background: ACCENTS[a],
                border: a === accent ? "2px solid var(--ink)" : "1.5px solid var(--rule)",
                borderRadius: "50%",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Shortcuts">
        {[
          ["Command palette", "⌘K"],
          ["Claude in new pane", "⌘J"],
          ["New terminal", "⌃ `"],
          ["Split right", "⌘ \\"],
          ["Split down", "⌘ ⇧ \\"],
          ["Close pane", "⌘W"],
          ["Switch layout", "⌘1 / ⌘2 / ⌘3 / ⌘4"],
        ].map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </Group>

      <Group label="About">
        <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Clauna v0.1.0 — minimalist vibe-coding IDE.<br />
          Tauri 2 · React 18 · CodeMirror 6 · xterm.js
        </div>
      </Group>
    </div>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        className="hand-label"
        style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px dashed rgba(31,29,26,0.15)",
      }}
    >
      <span style={{ color: "var(--ink-soft)" }}>{k}</span>
      <span className="kbd">{v}</span>
    </div>
  );
}
