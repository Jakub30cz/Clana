import { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { PaneShell } from "@/components/panes/PaneShell";
import { Glyph } from "@/lib/glyphs";
import { useStore } from "@/state/store";

export function LayoutClaudeDock() {
  const tree = useStore((s) => s.tree);

  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
      <Sidebar width={200} />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <PaneShell pane={tree} />
        </div>
      </div>
      <ClaudeDock />
    </div>
  );
}

interface Msg {
  who: "you" | "claude";
  text: string;
}

const SEED: Msg[] = [
  { who: "you", text: "add keyboard shortcut to split editor right" },
  {
    who: "claude",
    text: "I'll wire ⌘\\ in the keymap and dispatch a SPLIT_RIGHT action.",
  },
];

function ClaudeDock() {
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [input, setInput] = useState("");
  const splitPane = useStore((s) => s.splitPane);
  const activePaneId = useStore((s) => s.activePaneId);

  useEffect(() => {
    /* placeholder; in a follow-up wire to a real claude session over PTY or SDK */
  }, []);

  const send = () => {
    if (!input.trim()) return;
    setMsgs((m) => [...m, { who: "you", text: input }]);
    setInput("");
    setTimeout(() => {
      setMsgs((m) => [
        ...m,
        {
          who: "claude",
          text: "Claude integration is wired through ⌘J — opens a real Claude Code session in a pane. Use that for anything the docked chat can't answer.",
        },
      ]);
    }, 250);
  };

  return (
    <div
      style={{
        width: 320,
        flexShrink: 0,
        borderLeft: "2px solid var(--rule)",
        background: "var(--paper-2)",
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
      }}
    >
      <div style={{ padding: "8px 12px", display: "flex", alignItems: "center", gap: 8, borderBottom: "1.5px solid var(--rule)" }}>
        <Glyph name="sparkle" size={14} color="var(--accent)" />
        <span className="hand-title" style={{ fontSize: 16 }}>claude</span>
        <span style={{ flex: 1 }} />
        <button
          className="sketch-btn"
          style={{ transform: "none" }}
          onClick={() => splitPane(activePaneId, "h", "claude")}
        >
          ⌘J open
        </button>
      </div>
      <div className="no-scroll-chrome" style={{ flex: 1, overflow: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 14 }}>
        {msgs.map((m, i) => (
          <div key={i}>
            <div style={{ fontSize: 11, color: m.who === "you" ? "var(--ink-faint)" : "var(--accent)", fontFamily: "var(--mono)", marginBottom: 4 }}>
              {m.who}
            </div>
            <div className="hand-label" style={{ fontSize: 13, lineHeight: 1.5 }}>{m.text}</div>
          </div>
        ))}
      </div>
      <div style={{ padding: 10, borderTop: "1.5px solid var(--rule)" }}>
        <div className="sketch-frame thin" style={{ padding: 6, background: "var(--paper)", display: "flex" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send()}
            placeholder="ask claude…"
            style={{
              flex: 1,
              border: "none",
              background: "transparent",
              fontFamily: "var(--hand)",
              fontSize: 13,
              outline: "none",
              color: "var(--ink)",
            }}
          />
        </div>
      </div>
    </div>
  );
}
