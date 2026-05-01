import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ask } from "@tauri-apps/plugin-dialog";
import { Glyph } from "@/lib/glyphs";
import { ipc, safeIpc, DirEntry } from "@/lib/ipc";
import { useStore } from "@/state/store";
import { findLeafBy } from "@/lib/paneTree";
import { ContextMenu, ContextMenuItem } from "@/components/ContextMenu";
import { beginDrag } from "@/lib/dragManager";

const DRAG_MIME = "application/x-clana-path";

interface Node {
  name: string;
  path: string;
  isDir: boolean;
  open: boolean;
  children: Node[] | null;
  loaded: boolean;
  /** when set, replace the row with an inline-edit input */
  editingMode?: "rename";
  /** parent path for refresh on mutation */
  parentPath?: string;
}

interface RootSection {
  /** absolute path of the workspace root folder */
  rootPath: string;
  /** display name (basename) */
  rootName: string;
  /** is this a workspace root header collapsed? */
  collapsed: boolean;
  /** loaded children of the root */
  nodes: Node[];
}

interface DraftRow {
  parentPath: string;
  parentNode: Node | null; // null = a workspace root
  rootPath: string; // which root this draft belongs to
  kind: "file" | "dir";
}

function toNode(entry: DirEntry, parentPath: string): Node {
  return {
    name: entry.name,
    path: entry.path,
    isDir: entry.is_dir,
    open: false,
    children: entry.is_dir ? [] : null,
    loaded: !entry.is_dir,
    parentPath,
  };
}

async function loadDir(path: string): Promise<Node[]> {
  const entries = await safeIpc(() => ipc.listDir(path), [] as DirEntry[]);
  return entries.map((e) => toNode(e, path));
}

function joinPath(parent: string, name: string): string {
  if (!parent) return name;
  if (parent.endsWith("/") || parent.endsWith("\\")) return parent + name;
  return parent + "/" + name;
}

function basename(p: string): string {
  return p.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || p;
}

export function FileTree() {
  const workdir = useStore((s) => s.workdir);
  const workspace = useStore((s) => s.workspace);
  const openFile = useStore((s) => s.openFile);
  const removeFolderFromWorkspace = useStore((s) => s.removeFolderFromWorkspace);

  const folders = useMemo<string[]>(() => {
    if (workspace) return workspace.folders;
    if (workdir) return [workdir];
    return [];
  }, [workdir, workspace]);

  const isWorkspaceMode = Boolean(workspace);

  const [sections, setSections] = useState<RootSection[]>([]);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    node: Node | null;
    rootPath: string;
  } | null>(null);
  const [draft, setDraft] = useState<DraftRow | null>(null);
  const [, force] = useState(0);
  const refresh = () => force((n) => n + 1);

  // The path of whichever editor tab is currently active anywhere in the tree — used to highlight the file row.
  const tree = useStore((s) => s.tree);
  const activeFilePath = useMemo(() => {
    const leaf = findLeafBy(tree, (l) => l.kind === "editor" && !!l.activeTab);
    return leaf?.activeTab ?? null;
  }, [tree]);

  // Load each root once when the folder list changes, preserving open/loaded state for unchanged roots.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next: RootSection[] = await Promise.all(
        folders.map(async (root) => {
          const existing = sections.find((s) => s.rootPath === root);
          if (existing) return existing;
          const nodes = await loadDir(root);
          return {
            rootPath: root,
            rootName: basename(root),
            collapsed: false,
            nodes,
          };
        })
      );
      if (!cancelled) setSections(next);
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [folders.join("|")]);

  /** Find which root a given path belongs to. */
  const rootOfPath = (path: string): string | null => {
    for (const s of sections) {
      if (path === s.rootPath || path.startsWith(s.rootPath + "/") || path.startsWith(s.rootPath + "\\")) {
        return s.rootPath;
      }
    }
    return null;
  };

  /** Reload the children of a directory in-place across all roots. */
  const reloadDir = async (dirPath: string) => {
    const root = rootOfPath(dirPath);
    if (!root) return;
    if (dirPath === root) {
      const next = await loadDir(root);
      setSections((cur) =>
        cur.map((s) => (s.rootPath === root ? { ...s, nodes: next } : s))
      );
      return;
    }
    const target = findNodeByPathInSections(sections, dirPath);
    if (!target) return;
    target.children = await loadDir(dirPath);
    target.loaded = true;
    target.open = true;
    refresh();
  };

  const onClickRow = async (node: Node) => {
    if (node.isDir) {
      if (!node.loaded) {
        node.children = await loadDir(node.path);
        node.loaded = true;
      }
      node.open = !node.open;
      refresh();
    } else {
      const text = await safeIpc(() => ipc.readText(node.path), "");
      openFile(node.path, node.name, text);
    }
  };

  const toggleSection = (rootPath: string) => {
    setSections((cur) =>
      cur.map((s) => (s.rootPath === rootPath ? { ...s, collapsed: !s.collapsed } : s))
    );
  };

  // ── drag-drop targets on folders ────────────────────────────
  const onFolderDrop = async (
    e: React.DragEvent,
    target: Node | null,
    sectionRoot: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    const src = e.dataTransfer.getData(DRAG_MIME);
    if (!src) return;
    const dstParent = target ? target.path : sectionRoot;
    const dst = joinPath(dstParent, basename(src));
    if (src === dst) return;
    if (dst.startsWith(src + "/") || dst.startsWith(src + "\\")) return;
    // Disallow cross-root moves; the destination root must contain src too.
    const srcRoot = rootOfPath(src);
    if (srcRoot && srcRoot !== sectionRoot) return;
    const ok = await safeIpc(async () => {
      await ipc.movePath(src, dst);
      return true;
    }, false);
    if (!ok) return;
    const srcParent = src.substring(0, Math.max(src.lastIndexOf("/"), src.lastIndexOf("\\")));
    if (srcParent) await reloadDir(srcParent);
    await reloadDir(dstParent);
  };

  // ── context-menu actions ────────────────────────────────────
  const startRename = (node: Node) => {
    node.editingMode = "rename";
    refresh();
  };

  const commitRename = async (node: Node, newName: string) => {
    node.editingMode = undefined;
    if (!newName || newName === node.name) {
      refresh();
      return;
    }
    const parent = node.parentPath || rootOfPath(node.path) || "";
    if (!parent) return;
    const newPath = joinPath(parent, newName);
    const ok = await safeIpc(async () => {
      await ipc.movePath(node.path, newPath);
      return true;
    }, false);
    if (ok) await reloadDir(parent);
    else refresh();
  };

  const cancelRename = (node: Node) => {
    node.editingMode = undefined;
    refresh();
  };

  const onConfirmDelete = async (node: Node) => {
    const yes = await ask(
      `Delete "${node.name}"?` + (node.isDir ? "\n\nThis will recursively remove the folder." : ""),
      { title: "Delete", kind: "warning" }
    );
    if (!yes) return;
    const parent = node.parentPath || rootOfPath(node.path);
    if (!parent) return;
    await safeIpc(async () => {
      await ipc.deletePath(node.path);
    }, undefined);
    await reloadDir(parent);
  };

  const onCopyPath = (node: Node) => {
    navigator.clipboard.writeText(node.path).catch(() => {});
  };

  const onReveal = (node: Node) => {
    safeIpc(() => ipc.revealInExplorer(node.path), undefined);
  };

  const startNewDraft = async (
    parentNode: Node | null,
    rootPath: string,
    kind: "file" | "dir"
  ) => {
    if (parentNode) {
      if (!parentNode.loaded) {
        parentNode.children = await loadDir(parentNode.path);
        parentNode.loaded = true;
      }
      parentNode.open = true;
    }
    setDraft({
      parentPath: parentNode ? parentNode.path : rootPath,
      parentNode,
      rootPath,
      kind,
    });
  };

  const commitDraft = async (name: string) => {
    if (!draft || !name) {
      setDraft(null);
      return;
    }
    const fullPath = joinPath(draft.parentPath, name);
    const ok = await safeIpc(async () => {
      if (draft.kind === "dir") await ipc.createDir(fullPath);
      else await ipc.createFile(fullPath);
      return true;
    }, false);
    setDraft(null);
    if (ok) await reloadDir(draft.parentPath);
  };

  // ── menu builders ───────────────────────────────────────────
  const itemsForNode = (node: Node, rootPath: string): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [];
    if (node.isDir) {
      items.push({ id: "newFile", label: "New File", icon: "doc", onClick: () => startNewDraft(node, rootPath, "file") });
      items.push({ id: "newDir", label: "New Folder", icon: "folder", onClick: () => startNewDraft(node, rootPath, "dir") });
      items.push({ id: "sep1", label: "—", disabled: true, onClick: () => {} });
    }
    items.push({ id: "rename", label: "Rename", onClick: () => startRename(node) });
    items.push({ id: "delete", label: "Delete", danger: true, onClick: () => onConfirmDelete(node) });
    items.push({ id: "sep2", label: "—", disabled: true, onClick: () => {} });
    items.push({ id: "copy", label: "Copy Path", onClick: () => onCopyPath(node) });
    items.push({ id: "reveal", label: "Reveal in Finder", onClick: () => onReveal(node) });
    return items;
  };

  const itemsForRoot = (rootPath: string): ContextMenuItem[] => {
    const items: ContextMenuItem[] = [
      { id: "newFile", label: "New File", icon: "doc", onClick: () => startNewDraft(null, rootPath, "file") },
      { id: "newDir", label: "New Folder", icon: "folder", onClick: () => startNewDraft(null, rootPath, "dir") },
      { id: "sep", label: "—", disabled: true, onClick: () => {} },
      { id: "copy", label: "Copy Path", onClick: () => navigator.clipboard.writeText(rootPath).catch(() => {}) },
      { id: "reveal", label: "Reveal in Finder", onClick: () => safeIpc(() => ipc.revealInExplorer(rootPath), undefined) },
    ];
    if (isWorkspaceMode) {
      items.push({ id: "sep2", label: "—", disabled: true, onClick: () => {} });
      items.push({
        id: "remove",
        label: "Remove from Workspace",
        danger: true,
        onClick: () => removeFolderFromWorkspace(rootPath),
      });
    }
    return items;
  };

  return (
    <div
      className="no-scroll-chrome"
      style={{ overflow: "auto", flex: 1, padding: "4px 0" }}
    >
      {sections.map((section) => (
        <RootSectionView
          key={section.rootPath}
          section={section}
          isWorkspaceMode={isWorkspaceMode}
          activeFilePath={activeFilePath}
          draft={draft}
          onClickRow={onClickRow}
          onToggleSection={toggleSection}
          onContextMenuRoot={(e) => {
            e.preventDefault();
            setMenu({ x: e.clientX, y: e.clientY, node: null, rootPath: section.rootPath });
          }}
          onContextMenuNode={(e, node) => {
            e.preventDefault();
            e.stopPropagation();
            setMenu({ x: e.clientX, y: e.clientY, node, rootPath: section.rootPath });
          }}
          onFolderDrop={(e, target) => onFolderDrop(e, target, section.rootPath)}
          onCommitRename={commitRename}
          onCancelRename={cancelRename}
          onCommitDraft={commitDraft}
          onCancelDraft={() => setDraft(null)}
        />
      ))}

      {sections.length === 0 && (
        <div style={{ padding: "10px 14px", fontSize: 12, color: "var(--ink-faint)", lineHeight: 1.5 }}>
          No folder open. Use <span className="kbd">File &gt; Open Folder</span> or drop a folder here.
        </div>
      )}

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          items={menu.node ? itemsForNode(menu.node, menu.rootPath) : itemsForRoot(menu.rootPath)}
          onClose={() => setMenu(null)}
        />
      )}
    </div>
  );
}

interface SectionProps {
  section: RootSection;
  isWorkspaceMode: boolean;
  activeFilePath: string | null;
  draft: DraftRow | null;
  onClickRow: (node: Node) => void;
  onToggleSection: (rootPath: string) => void;
  onContextMenuRoot: (e: React.MouseEvent) => void;
  onContextMenuNode: (e: React.MouseEvent, node: Node) => void;
  onFolderDrop: (e: React.DragEvent, target: Node | null) => void;
  onCommitRename: (node: Node, newName: string) => void;
  onCancelRename: (node: Node) => void;
  onCommitDraft: (name: string) => void;
  onCancelDraft: () => void;
}

function RootSectionView(props: SectionProps) {
  const { section, isWorkspaceMode, draft, activeFilePath } = props;
  const showDraft = draft && draft.parentNode === null && draft.rootPath === section.rootPath;

  return (
    <div
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_MIME)) {
          e.preventDefault();
          e.dataTransfer.dropEffect = "move";
        }
      }}
      onDrop={(e) => props.onFolderDrop(e, null)}
    >
      <div
        className="side-item"
        style={{
          paddingLeft: 6,
          fontWeight: 700,
          background: isWorkspaceMode ? "var(--paper-2)" : undefined,
        }}
        onClick={() => isWorkspaceMode && props.onToggleSection(section.rootPath)}
        onContextMenu={props.onContextMenuRoot}
      >
        <span
          style={{
            width: 12,
            transform: !section.collapsed ? "rotate(90deg)" : "none",
            transition: "transform .1s",
            display: "inline-flex",
          }}
        >
          {isWorkspaceMode && <Glyph name="chevron" size={10} />}
        </span>
        <Glyph name="folder-open" size={12} />
        <span style={{ flex: 1 }}>{section.rootName}</span>
      </div>

      {!section.collapsed && (
        <>
          {showDraft && (
            <DraftRowView
              depth={1}
              kind={draft!.kind}
              onCommit={props.onCommitDraft}
              onCancel={props.onCancelDraft}
            />
          )}
          {section.nodes.map((n) => (
            <NodeRow
              key={n.path}
              node={n}
              depth={1}
              activeFilePath={activeFilePath}
              draft={draft}
              onClick={props.onClickRow}
              onContextMenu={props.onContextMenuNode}
              onFolderDrop={props.onFolderDrop}
              onCommitRename={props.onCommitRename}
              onCancelRename={props.onCancelRename}
              onCommitDraft={props.onCommitDraft}
              onCancelDraft={props.onCancelDraft}
            />
          ))}
        </>
      )}
    </div>
  );
}

interface RowProps {
  node: Node;
  depth: number;
  activeFilePath: string | null;
  draft: DraftRow | null;
  onClick: (node: Node) => void;
  onContextMenu: (e: React.MouseEvent, node: Node) => void;
  onFolderDrop: (e: React.DragEvent, target: Node | null) => void;
  onCommitRename: (node: Node, newName: string) => void;
  onCancelRename: (node: Node) => void;
  onCommitDraft: (name: string) => void;
  onCancelDraft: () => void;
}

function NodeRow(props: RowProps) {
  const { node, depth, activeFilePath, draft } = props;
  const isActive = !node.isDir && node.path === activeFilePath;

  if (node.editingMode === "rename") {
    return (
      <InlineEditRow
        depth={depth}
        initial={node.name}
        icon={node.isDir ? "folder" : "doc"}
        onCommit={(name) => props.onCommitRename(node, name)}
        onCancel={() => props.onCancelRename(node)}
      />
    );
  }

  return (
    <>
      <div
        className={clsx("side-item", { active: isActive })}
        style={{
          paddingLeft: 6 + depth * 14,
          borderLeft: isActive ? "3px solid var(--accent)" : "3px solid transparent",
          cursor: node.isDir ? "default" : "pointer",
        }}
        onMouseDown={(e) => {
          // Files are draggable into panes; folders are not (yet).
          if (node.isDir) {
            // Folders just click to expand/collapse.
            if (e.button === 0) props.onClick(node);
            return;
          }
          beginDrag(
            e,
            { type: "file", path: node.path, name: node.name },
            () => props.onClick(node),
          );
        }}
        onContextMenu={(e) => props.onContextMenu(e, node)}
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
          <Glyph name={node.isDir ? (node.open ? "folder-open" : "folder") : "doc"} size={12} />
        </span>
        <span style={{ flex: 1 }}>{node.name}</span>
      </div>

      {node.isDir && node.open && draft && draft.parentNode === node && (
        <DraftRowView
          depth={depth + 1}
          kind={draft.kind}
          onCommit={props.onCommitDraft}
          onCancel={props.onCancelDraft}
        />
      )}

      {node.isDir && node.open && node.children?.map((c) => (
        <NodeRow {...props} node={c} depth={depth + 1} />
      ))}
    </>
  );
}

function DraftRowView({
  depth,
  kind,
  onCommit,
  onCancel,
}: {
  depth: number;
  kind: "file" | "dir";
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  return (
    <InlineEditRow
      depth={depth}
      initial=""
      icon={kind === "dir" ? "folder" : "doc"}
      placeholder={kind === "dir" ? "new folder name…" : "new file name…"}
      onCommit={onCommit}
      onCancel={onCancel}
    />
  );
}

function InlineEditRow({
  depth,
  initial,
  icon,
  placeholder,
  onCommit,
  onCancel,
}: {
  depth: number;
  initial: string;
  icon: "doc" | "folder";
  placeholder?: string;
  onCommit: (name: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <div
      className="side-item"
      style={{ paddingLeft: 6 + depth * 14 }}
      onClick={(e) => e.stopPropagation()}
    >
      <span style={{ width: 12 }} />
      <span className="glyph">
        <Glyph name={icon} size={12} />
      </span>
      <input
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onCommit(value.trim());
          } else if (e.key === "Escape") {
            e.preventDefault();
            onCancel();
          }
        }}
        onBlur={() => {
          if (value.trim()) onCommit(value.trim());
          else onCancel();
        }}
        style={{
          flex: 1,
          background: "var(--paper-2)",
          border: "1.5px dashed var(--accent)",
          borderRadius: 3,
          padding: "1px 4px",
          font: "inherit",
          color: "var(--ink)",
          outline: "none",
        }}
      />
    </div>
  );
}

function findNodeByPath(nodes: Node[], path: string): Node | null {
  for (const n of nodes) {
    if (n.path === path) return n;
    if (n.children) {
      const r = findNodeByPath(n.children, path);
      if (r) return r;
    }
  }
  return null;
}

function findNodeByPathInSections(sections: RootSection[], path: string): Node | null {
  for (const s of sections) {
    const r = findNodeByPath(s.nodes, path);
    if (r) return r;
  }
  return null;
}
