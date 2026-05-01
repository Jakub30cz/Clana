import { useEffect, useRef } from "react";
import { Glyph } from "@/lib/glyphs";
import { useStore } from "@/state/store";
import { openFolderDialog, basename } from "@/lib/dialog";

export function WorkspacePicker() {
  const workdir = useStore((s) => s.workdir);
  const recent = useStore((s) => s.recentWorkspaces);
  const openWorkspace = useStore((s) => s.openWorkspace);
  const removeRecent = useStore((s) => s.removeRecentWorkspace);
  const open = useStore((s) => s.workspaceMenuOpen);
  const setOpen = useStore((s) => s.setWorkspaceMenuOpen);
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

  const pickFolder = async () => {
    const path = await openFolderDialog(workdir || undefined);
    if (path) openWorkspace(path);
    setOpen(false);
  };

  const name = workdir ? basename(workdir) : "no folder";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        className="sketch-btn"
        onClick={() => setOpen(!open)}
        title={workdir || "open a folder"}
        style={{ display: "flex", alignItems: "center", gap: 6, maxWidth: 240 }}
      >
        <Glyph name="folder" size={12} />
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: 160,
          }}
        >
          {name}
        </span>
        <Glyph name="chevron-d" size={10} />
      </button>
      {open && (
        <div
          className="sketch-frame"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            width: 320,
            zIndex: 40,
            padding: 6,
            background: "var(--paper)",
            transform: "none",
          }}
        >
          <div
            className="side-item"
            style={{ padding: "8px 10px", fontSize: 13, gap: 10, fontWeight: 700 }}
            onClick={pickFolder}
          >
            <Glyph name="plus" size={14} />
            <span style={{ flex: 1 }}>Open folder…</span>
            <span className="kbd">⌘O</span>
          </div>
          {recent.length > 0 && (
            <>
              <div
                style={{
                  fontSize: 11,
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  opacity: 0.7,
                  padding: "10px 10px 4px",
                  fontFamily: "var(--font-hand)",
                }}
              >
                Recent
              </div>
              <div style={{ maxHeight: 280, overflow: "auto" }}>
                {recent.map((r) => (
                  <div
                    key={r.path}
                    className={"side-item" + (r.path === workdir ? " active" : "")}
                    style={{ padding: "6px 10px", fontSize: 12, gap: 8 }}
                    onClick={() => {
                      openWorkspace(r.path);
                      setOpen(false);
                    }}
                  >
                    <Glyph name="folder" size={12} />
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
                    <button
                      className="act-icon"
                      title="remove from recent"
                      style={{ width: 22, height: 22 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        removeRecent(r.path);
                      }}
                    >
                      <Glyph name="x" size={11} />
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
