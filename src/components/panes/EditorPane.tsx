import { useEffect, useMemo } from "react";
import CodeMirror, { Extension } from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { markdown } from "@codemirror/lang-markdown";
import { rust } from "@codemirror/lang-rust";
import { json } from "@codemirror/lang-json";
import { EditorView } from "@codemirror/view";
import { PaneLeaf } from "@/lib/paneTree";
import { useStore } from "@/state/store";
import { ipc, safeIpc } from "@/lib/ipc";
import { buildEditorTheme } from "@/lib/editorTheme";
import { useResolvedColorMode } from "@/lib/useResolvedColorMode";
import { TabStrip } from "./TabStrip";

interface Props {
  pane: PaneLeaf;
}

export function EditorPane({ pane }: Props) {
  const openFiles = useStore((s) => s.openFiles);
  const setFileContents = useStore((s) => s.setFileContents);
  const markFileSaved = useStore((s) => s.markFileSaved);
  const theme = useStore((s) => s.theme);
  const syntaxPalette = useStore((s) => s.syntaxPalette);
  const resolvedMode = useResolvedColorMode();

  const path = pane.activeTab;
  const file = path ? openFiles[path] : undefined;
  const name = file?.name ?? pane.name ?? "untitled";

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
    langs.push(...buildEditorTheme(syntaxPalette, theme, resolvedMode));
    langs.push(EditorView.lineWrapping);
    return langs;
  }, [name, syntaxPalette, theme, resolvedMode]);

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
      <TabStrip pane={pane} />
      <div style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
        {file && path ? (
          <CodeMirror
            key={path}
            value={file.contents}
            height="100%"
            extensions={ext}
            basicSetup={{
              lineNumbers: true,
              foldGutter: false,
              highlightActiveLine: true,
              indentOnInput: true,
              bracketMatching: true,
            }}
            onChange={(v) => setFileContents(path, v)}
          />
        ) : (
          <EmptyEditorBackground />
        )}
      </div>
    </div>
  );
}

function EmptyEditorBackground() {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
        color: "var(--ink-faint)",
        userSelect: "none",
        pointerEvents: "none",
        padding: 24,
      }}
    >
      <img
        src="/logo.png"
        alt=""
        width={84}
        height={84}
        style={{ opacity: 0.55, borderRadius: 18 }}
      />
      <div
        className="hand-title"
        style={{ fontSize: 22, color: "var(--ink-soft)" }}
      >
        Clana
      </div>
      <div
        style={{
          fontSize: 12,
          fontFamily: "var(--font-hand)",
          textAlign: "center",
          maxWidth: 360,
          lineHeight: 1.6,
        }}
      >
        Pick a file from the sidebar, or use{" "}
        <span className="kbd">⌘K</span> for the command palette.
      </div>
    </div>
  );
}
