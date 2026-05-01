import { useEffect, useMemo, useState } from "react";
import { Glyph, GlyphName } from "@/lib/glyphs";
import { useStore } from "@/state/store";
import { openFolderDialog } from "@/lib/dialog";

interface Item {
  icon: GlyphName;
  label: string;
  kbd: string;
  run: () => void;
}

export function CommandPalette() {
  const open = useStore((s) => s.paletteOpen);
  const setOpen = useStore((s) => s.setPaletteOpen);
  const splitPane = useStore((s) => s.splitPane);
  const setLayout = useStore((s) => s.setLayout);
  const setSidePanel = useStore((s) => s.setSidePanel);
  const closePane = useStore((s) => s.closePane);

  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    if (open) {
      setQ("");
      setIdx(0);
    }
  }, [open]);

  const items = useMemo<Item[]>(() => {
    const active = useStore.getState().activePaneId;
    return [
      {
        icon: "folder",
        label: "Open folder…",
        kbd: "⌘O",
        run: async () => {
          const path = await openFolderDialog(useStore.getState().workdir || undefined);
          if (path) useStore.getState().openWorkspace(path);
        },
      },
      {
        icon: "sparkle",
        label: "Open Claude in new pane",
        kbd: "⌘J",
        run: () => splitPane(active, "h", "claude"),
      },
      {
        icon: "terminal",
        label: "New terminal",
        kbd: "⌃ `",
        run: () => splitPane(active, "v", "shell"),
      },
      {
        icon: "split-h",
        label: "Split editor right",
        kbd: "⌘ \\",
        run: () => splitPane(active, "h", "editor"),
      },
      {
        icon: "split-v",
        label: "Split editor down",
        kbd: "⌘ ⇧ \\",
        run: () => splitPane(active, "v", "editor"),
      },
      {
        icon: "x",
        label: "Close active pane",
        kbd: "⌘W",
        run: () => closePane(active),
      },
      {
        icon: "settings",
        label: "Settings",
        kbd: "⌘,",
        run: () => setSidePanel("settings"),
      },
      {
        icon: "layers",
        label: "Layout: Classic",
        kbd: "⌘1",
        run: () => setLayout("classic"),
      },
      {
        icon: "layers",
        label: "Layout: Zen",
        kbd: "⌘2",
        run: () => setLayout("zen"),
      },
      {
        icon: "layers",
        label: "Layout: Tiled",
        kbd: "⌘3",
        run: () => setLayout("tiled"),
      },
    ];
  }, [splitPane, setLayout, setSidePanel, closePane]);

  const filtered = useMemo(() => {
    if (!q) return items;
    const needle = q.toLowerCase();
    return items.filter((i) => i.label.toLowerCase().includes(needle));
  }, [q, items]);

  if (!open) return null;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIdx((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      filtered[idx]?.run();
      setOpen(false);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div className="palette-overlay" onClick={() => setOpen(false)}>
      <div
        className="sketch-frame"
        style={{ width: 460, background: "var(--paper)", boxShadow: "4px 4px 0 var(--rule)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ padding: 10, borderBottom: "1.5px solid var(--rule)" }}>
          <input
            autoFocus
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setIdx(0);
            }}
            onKeyDown={onKey}
            placeholder="type a command…"
            style={{
              width: "100%",
              border: "none",
              background: "transparent",
              fontFamily: "var(--hand)",
              fontSize: 16,
              outline: "none",
              color: "var(--ink)",
            }}
          />
        </div>
        <div style={{ maxHeight: 320, overflow: "auto", padding: 6 }}>
          {filtered.length === 0 && (
            <div style={{ padding: 14, color: "var(--ink-faint)", fontSize: 13 }}>no matches</div>
          )}
          {filtered.map((it, i) => (
            <div
              key={it.label}
              className={"side-item" + (i === idx ? " active" : "")}
              style={{ padding: "8px 10px", fontSize: 14, gap: 10 }}
              onClick={() => {
                it.run();
                setOpen(false);
              }}
              onMouseEnter={() => setIdx(i)}
            >
              <Glyph name={it.icon} size={14} />
              <span style={{ flex: 1 }}>{it.label}</span>
              <span className="kbd">{it.kbd}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
