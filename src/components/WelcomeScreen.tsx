import { Glyph } from "@/lib/glyphs";
import { useStore, type RecentEntry } from "@/state/store";
import { loadWorkspaceFromDisk } from "@/lib/workspaceFile";

export function WelcomeScreen() {
  const recent = useStore((s) => s.recentEntries);
  const openFolder = useStore((s) => s.openFolder);
  const openWorkspaceFile = useStore((s) => s.openWorkspaceFile);

  const onClickRecent = async (r: RecentEntry) => {
    if (r.kind === "folder") {
      openFolder(r.path);
    } else {
      try {
        const ws = await loadWorkspaceFromDisk(r.filePath);
        openWorkspaceFile(r.filePath, ws);
      } catch (e) {
        console.error("failed to load workspace", e);
      }
    }
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
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 12 }}>
          <img
            src="/logo.png"
            alt="Clana"
            width={56}
            height={56}
            style={{ borderRadius: 12, flexShrink: 0 }}
          />
          <div style={{ minWidth: 0 }}>
            <div
              className="hand-title"
              style={{ fontSize: 30, lineHeight: 1, color: "var(--ink)" }}
            >
              Welcome to Clana
            </div>
            <div
              className="hand-label"
              style={{ fontSize: 14, color: "var(--ink-soft)", marginTop: 2 }}
            >
              A minimalist vibe-coding IDE. Files, splits, terminal, and Claude — at one keystroke.
            </div>
          </div>
        </div>

        <div
          className="sketch-frame"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "14px 16px",
            background: "var(--paper-2)",
            borderStyle: "dashed",
            color: "var(--ink-soft)",
          }}
        >
          <Glyph name="folder" size={18} />
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.4 }}>
            <div style={{ fontWeight: 600, color: "var(--ink)" }}>
              Drop a folder here
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-faint)" }}>
              or use <span className="kbd">File &gt; Open Folder</span>{" "}
              <span className="kbd">⌘O</span> to open one. Drop multiple
              folders to start a workspace.
            </div>
          </div>
        </div>

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
              {recent.slice(0, 6).map((r) => {
                const subPath = r.kind === "folder" ? r.path : r.filePath;
                const icon = r.kind === "folder" ? "folder" : "doc";
                return (
                  <div
                    key={`${r.kind}:${subPath}`}
                    className="side-item"
                    style={{ padding: "8px 10px", fontSize: 13, gap: 10 }}
                    onClick={() => onClickRecent(r)}
                  >
                    <Glyph name={icon} size={13} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600 }}>
                        {r.name}
                        {r.kind === "workspace" && (
                          <span
                            style={{
                              fontSize: 10,
                              marginLeft: 8,
                              padding: "1px 6px",
                              borderRadius: 8,
                              background: "var(--accent-soft)",
                              color: "var(--accent)",
                              fontFamily: "var(--font-mono)",
                              textTransform: "uppercase",
                            }}
                          >
                            workspace
                          </span>
                        )}
                      </div>
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
                        {subPath}
                      </div>
                    </div>
                  </div>
                );
              })}
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
