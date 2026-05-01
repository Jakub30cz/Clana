import { useState } from "react";
import { Glyph } from "@/lib/glyphs";
import { ipc, safeIpc, SearchHit } from "@/lib/ipc";
import { useStore } from "@/state/store";

export function SearchPanel() {
  const workdir = useStore((s) => s.workdir);
  const activePaneId = useStore((s) => s.activePaneId);
  const openFileInPane = useStore((s) => s.openFileInPane);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!workdir || !query.trim()) {
      setHits([]);
      return;
    }
    setBusy(true);
    const r = await safeIpc(() => ipc.search(workdir, query), [] as SearchHit[]);
    setHits(r);
    setBusy(false);
  };

  const grouped = groupByFile(hits);
  const fileCount = Object.keys(grouped).length;

  return (
    <div style={{ padding: "6px 10px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && run()}
        placeholder="search…"
        style={{
          width: "100%", padding: 6,
          fontFamily: "var(--mono)", fontSize: 12,
          background: "var(--paper-2)", border: "1.5px solid var(--rule)",
          borderRadius: 4, color: "var(--ink)",
        }}
      />
      <div style={{ fontFamily: "var(--hand)", fontSize: 12, color: "var(--ink-soft)" }}>
        {busy ? "searching…" : `${hits.length} results in ${fileCount} files`}
      </div>
      <div className="no-scroll-chrome" style={{ overflow: "auto", flex: 1 }}>
        {Object.entries(grouped).map(([path, list]) => (
          <div key={path}>
            <div
              className="side-item"
              style={{ fontWeight: 700, fontSize: 12 }}
              onClick={async () => {
                const text = await safeIpc(() => ipc.readText(path), "");
                openFileInPane(activePaneId, path, path.split("/").pop() ?? path, text);
              }}
            >
              <Glyph name="chevron-d" size={10} />
              <Glyph name="doc" size={11} />
              <span>{path.replace(workdir + "/", "")}</span>
              <span style={{ color: "var(--ink-faint)", fontFamily: "var(--mono)", fontSize: 11 }}>
                {list.length}
              </span>
            </div>
            {list.slice(0, 6).map((h, i) => (
              <div
                key={i}
                style={{
                  paddingLeft: 28,
                  fontFamily: "var(--mono)",
                  fontSize: 11,
                  color: "var(--ink-soft)",
                  lineHeight: 1.6,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                <span style={{ opacity: 0.5 }}>{h.line}: </span>
                {h.text}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function groupByFile(hits: SearchHit[]): Record<string, SearchHit[]> {
  const out: Record<string, SearchHit[]> = {};
  for (const h of hits) {
    (out[h.path] ??= []).push(h);
  }
  return out;
}
