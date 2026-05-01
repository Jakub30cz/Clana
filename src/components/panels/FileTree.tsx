import { useEffect, useState } from "react";
import clsx from "clsx";
import { Glyph } from "@/lib/glyphs";
import { ipc, safeIpc, DirEntry } from "@/lib/ipc";
import { useStore } from "@/state/store";

interface Node {
  name: string;
  path: string;
  isDir: boolean;
  open: boolean;
  children: Node[] | null;
  loaded: boolean;
}

function toNode(entry: DirEntry): Node {
  return {
    name: entry.name,
    path: entry.path,
    isDir: entry.is_dir,
    open: false,
    children: entry.is_dir ? [] : null,
    loaded: !entry.is_dir,
  };
}

async function loadDir(path: string): Promise<Node[]> {
  const entries = await safeIpc(() => ipc.listDir(path), [] as DirEntry[]);
  return entries.map(toNode);
}

export function FileTree() {
  const workdir = useStore((s) => s.workdir);
  const activePaneId = useStore((s) => s.activePaneId);
  const openFileInPane = useStore((s) => s.openFileInPane);
  const [roots, setRoots] = useState<Node[]>([]);
  const [rootName, setRootName] = useState<string>("");

  useEffect(() => {
    if (!workdir) return;
    setRootName(workdir.split("/").pop() ?? workdir);
    loadDir(workdir).then(setRoots);
  }, [workdir]);

  const toggle = async (target: Node) => {
    if (!target.isDir) {
      const text = await safeIpc(() => ipc.readText(target.path), "");
      openFileInPane(activePaneId, target.path, target.name, text);
      return;
    }
    if (!target.loaded) {
      target.children = await loadDir(target.path);
      target.loaded = true;
    }
    target.open = !target.open;
    setRoots((rs) => [...rs]);
  };

  return (
    <div className="no-scroll-chrome" style={{ overflow: "auto", flex: 1, padding: "4px 0" }}>
      <div className="side-item" style={{ paddingLeft: 6, fontWeight: 700 }}>
        <span style={{ width: 12 }} />
        <Glyph name="folder" size={12} />
        <span>{rootName || "(no workspace)"}</span>
      </div>
      {roots.map((n) => (
        <NodeRow key={n.path} node={n} depth={1} onToggle={toggle} />
      ))}
      {!workdir && (
        <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          No workspace open. Use <span className="kbd">⌘O</span> to open a folder, or run from a project directory.
        </div>
      )}
    </div>
  );
}

interface RowProps {
  node: Node;
  depth: number;
  onToggle: (n: Node) => void;
}

function NodeRow({ node, depth, onToggle }: RowProps) {
  return (
    <>
      <div
        className={clsx("side-item")}
        style={{ paddingLeft: 6 + depth * 14 }}
        onClick={() => onToggle(node)}
      >
        <span
          style={{
            width: 12,
            transform: node.isDir && node.open ? "rotate(90deg)" : "none",
            transition: "transform .1s",
            display: "inline-flex",
          }}
        >
          {node.isDir && <Glyph name="chevron" size={10} />}
        </span>
        <span className="glyph">
          <Glyph name={node.isDir ? "folder" : "doc"} size={12} />
        </span>
        <span style={{ flex: 1 }}>{node.name}</span>
      </div>
      {node.isDir && node.open && node.children?.map((c) => (
        <NodeRow key={c.path} node={c} depth={depth + 1} onToggle={onToggle} />
      ))}
    </>
  );
}
