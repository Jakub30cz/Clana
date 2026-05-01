import { useEffect, useMemo, useState } from "react";
import CodeMirror, { Extension } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { PaneLeaf } from "@/lib/paneTree";
import { useStore } from "@/state/store";
import { ipc, safeIpc } from "@/lib/ipc";

interface Props {
  pane: PaneLeaf;
}

const SAMPLE_README = `# Clana

a tiny vibe-coding ide.
files, splits, terminal, claude — at a keystroke.

## try it

- ⌘K — command palette
- ⌘J — claude in a new pane
- ⌃\` — new terminal
- ⌘\\\\ — split right
- ⌘1 / ⌘2 / ⌘3 / ⌘4 — switch layout

open a folder via the file panel on the left to start.
`;

export function EditorPane({ pane }: Props) {
  const openFiles = useStore((s) => s.openFiles);
  const setFileContents = useStore((s) => s.setFileContents);
  const markFileSaved = useStore((s) => s.markFileSaved);
  const [welcome] = useState(SAMPLE_README);

  const path = pane.filePath;
  const file = path ? openFiles[path] : undefined;
  const text = file?.contents ?? welcome;
  const name = file?.name ?? pane.name ?? "welcome.md";

  const ext = useMemo<Extension[]>(() => {
    const ext = name.split(".").pop()?.toLowerCase() ?? "md";
    const langs: Extension[] = [];
    if (ext === "ts" || ext === "tsx" || ext === "jsx" || ext === "js" || ext === "mjs" || ext === "cjs") {
      langs.push(javascript({ jsx: true, typescript: ext.includes("ts") }));
    } else if (ext === "rs") {
      langs.push(rust());
    } else if (ext === "json") {
      langs.push(json());
    } else if (ext === "md" || ext === "markdown") {
      langs.push(markdown());
    }
    langs.push(EditorView.lineWrapping);
    return langs;
  }, [name]);

  useEffect(() => {
    const onSave = (e: KeyboardEvent) => {
      const isMac = /Mac/.test(navigator.platform);
      if (((isMac && e.metaKey) || (!isMac && e.ctrlKey)) && e.key.toLowerCase() === "s") {
        if (!path || !file) return;
        const isActive = useStore.getState().activePaneId === pane.id;
        if (!isActive) return;
        e.preventDefault();
        safeIpc(() => ipc.writeText(path, file.contents), undefined).then(() => markFileSaved(path));
      }
    };
    window.addEventListener("keydown", onSave);
    return () => window.removeEventListener("keydown", onSave);
  }, [pane.id, path, file, markFileSaved]);

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "var(--paper)" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 8px",
          background: "var(--paper-2)",
          borderBottom: "1px dashed var(--rule)",
          fontSize: 12,
          fontFamily: "var(--hand)",
        }}
      >
        <span style={{ fontWeight: 600 }}>{name}</span>
        {file?.dirty && <span style={{ color: "var(--accent)" }}>●</span>}
        <span style={{ flex: 1 }} />
        {path && <span style={{ color: "var(--ink-faint)", fontSize: 11 }}>{shortPath(path)}</span>}
      </div>
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        <CodeMirror
          value={text}
          height="100%"
          extensions={ext}
          basicSetup={{
            lineNumbers: true,
            foldGutter: false,
            highlightActiveLine: true,
            indentOnInput: true,
            bracketMatching: true,
          }}
          onChange={(v) => {
            if (path) setFileContents(path, v);
          }}
        />
      </div>
    </div>
  );
}

function shortPath(p: string): string {
  const parts = p.split("/");
  return parts.length <= 3 ? p : ".../" + parts.slice(-3).join("/");
}
