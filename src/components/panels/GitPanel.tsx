import { useEffect, useState } from "react";
import { Glyph } from "@/lib/glyphs";
import { ipc, safeIpc, GitStatus } from "@/lib/ipc";
import { useStore } from "@/state/store";

const EMPTY: GitStatus = {
  branch: "—",
  ahead: 0,
  behind: 0,
  staged: [],
  changes: [],
};

export function GitPanel() {
  const workdir = useStore((s) => s.workdir);
  const [status, setStatus] = useState<GitStatus>(EMPTY);

  useEffect(() => {
    if (!workdir) return;
    let cancelled = false;
    const refresh = async () => {
      const r = await safeIpc(() => ipc.gitStatus(workdir), EMPTY);
      if (!cancelled) setStatus(r);
    };
    refresh();
    const id = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [workdir]);

  return (
    <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, color: "var(--ink-soft)" }}>
        <Glyph name="branch" size={12} />
        <span style={{ fontWeight: 700, color: "var(--ink)" }}>{status.branch || "HEAD"}</span>
        {status.ahead > 0 && <span style={{ fontSize: 11 }}>· {status.ahead} ahead</span>}
        {status.behind > 0 && <span style={{ fontSize: 11 }}>· {status.behind} behind</span>}
      </div>
      <textarea
        placeholder="commit message…"
        style={{
          width: "100%", minHeight: 44, padding: 6,
          fontFamily: "var(--hand)", fontSize: 13,
          background: "var(--paper-2)", border: "1.5px dashed var(--rule)",
          borderRadius: 4, resize: "none", color: "var(--ink)",
        }}
      />
      <button className="sketch-btn primary" style={{ width: "100%", transform: "none" }}>
        commit ✓
      </button>

      <Section label="Staged" items={status.staged} accent="var(--accent-2)" />
      <Section label="Changes" items={status.changes} accent="var(--accent)" />
    </div>
  );
}

function Section({
  label,
  items,
  accent,
}: {
  label: string;
  items: { path: string; status: string }[];
  accent: string;
}) {
  return (
    <div>
      <div className="hand-label" style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5 }}>
        {label} ({items.length})
      </div>
      {items.map((c) => (
        <div key={c.path} className="side-item">
          <span className="glyph">
            <Glyph name="doc" size={11} />
          </span>
          <span style={{ flex: 1, fontSize: 12 }}>{c.path}</span>
          <span style={{ color: accent, fontFamily: "var(--mono)", fontSize: 11 }}>{c.status}</span>
        </div>
      ))}
      {items.length === 0 && (
        <div style={{ padding: "4px 12px", fontSize: 12, color: "var(--ink-faint)" }}>—</div>
      )}
    </div>
  );
}
