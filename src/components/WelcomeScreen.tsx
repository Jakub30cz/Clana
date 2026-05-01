import { Glyph } from "@/lib/glyphs";
import { useStore } from "@/state/store";
import { openFolderDialog } from "@/lib/dialog";

export function WelcomeScreen() {
  const recent = useStore((s) => s.recentWorkspaces);
  const openWorkspace = useStore((s) => s.openWorkspace);

  const pick = async () => {
    const path = await openFolderDialog();
    if (path) openWorkspace(path);
  };

  return (
    <div
      style={{
        flex: 1,
        minHeight: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
      }}
    >
      <div
        className="sketch-frame"
        style={{
          maxWidth: 540,
          width: "100%",
          padding: 28,
          background: "var(--paper)",
          textAlign: "left",
        }}
      >
        <div
          className="hand-title"
          style={{ fontSize: 30, marginBottom: 4, color: "var(--ink)" }}
        >
          Welcome to Clana
        </div>
        <div
          className="hand-label"
          style={{ fontSize: 14, color: "var(--ink-soft)", marginBottom: 18 }}
        >
          A minimalist vibe-coding IDE. Files, splits, terminal,
          and Claude — at one keystroke.
        </div>

        <button
          className="sketch-btn primary"
          onClick={pick}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 15,
            padding: "8px 14px",
            transform: "none",
          }}
        >
          <Glyph name="folder" size={16} />
          <span>Open folder…</span>
          <span className="kbd" style={{ marginLeft: 8 }}>⌘O</span>
        </button>

        {recent.length > 0 && (
          <div style={{ marginTop: 22 }}>
            <div
              className="hand-label"
              style={{
                fontSize: 11,
                opacity: 0.7,
                textTransform: "uppercase",
                letterSpacing: 0.5,
                marginBottom: 8,
              }}
            >
              Recent
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {recent.slice(0, 6).map((r) => (
                <div
                  key={r.path}
                  className="side-item"
                  style={{ padding: "8px 10px", fontSize: 13, gap: 10 }}
                  onClick={() => openWorkspace(r.path)}
                >
                  <Glyph name="folder" size={13} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{r.name}</div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--ink-faint)",
                        fontFamily: "var(--font-mono)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.path}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div
          style={{
            marginTop: 22,
            fontSize: 12,
            color: "var(--ink-faint)",
            fontFamily: "var(--font-hand)",
            lineHeight: 1.6,
          }}
        >
          <div>
            <span className="kbd">⌘K</span> palette ·{" "}
            <span className="kbd">⌘J</span> claude ·{" "}
            <span className="kbd">⌃`</span> terminal
          </div>
          <div style={{ marginTop: 6 }}>
            <span className="kbd">⌘1</span> / <span className="kbd">⌘2</span> /{" "}
            <span className="kbd">⌘3</span> / <span className="kbd">⌘4</span> switch layout
          </div>
        </div>
      </div>
    </div>
  );
}
