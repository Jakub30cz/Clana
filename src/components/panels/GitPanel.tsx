import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Glyph } from "@/lib/glyphs";
import { ipc, safeIpc, BranchInfo, CommitGraph as CG, GitBranches, RemoteGroup } from "@/lib/ipc";
import { useStore } from "@/state/store";
import { CommitGraph } from "./CommitGraph";

const EMPTY: GitBranches = {
  current: "",
  detached: false,
  head_short: "",
  local: [],
  remotes: [],
};

const EMPTY_GRAPH: CG = { commits: [], refs_by_oid: {}, head: "" };

type View = "graph" | "list";

interface TreeNode {
  /** path-like key, e.g. "feature/scaffold" */
  key: string;
  /** displayed segment, last part of the key */
  label: string;
  /** leaf iff branch !== null; otherwise a grouping node */
  branch: BranchInfo | null;
  children: TreeNode[];
}

/** Build a tree from a flat list of branch names by splitting on "/". */
function buildTree(branches: BranchInfo[]): TreeNode[] {
  const root: TreeNode = { key: "", label: "", branch: null, children: [] };
  for (const b of branches) {
    const parts = b.name.split("/");
    let node = root;
    for (let i = 0; i < parts.length; i++) {
      const isLeaf = i === parts.length - 1;
      const key = parts.slice(0, i + 1).join("/");
      let child = node.children.find((c) => c.key === key);
      if (!child) {
        child = { key, label: parts[i], branch: null, children: [] };
        node.children.push(child);
      }
      if (isLeaf) child.branch = b;
      node = child;
    }
  }
  return root.children;
}

export function GitPanel() {
  const workdir = useStore((s) => s.workdir);
  const [data, setData] = useState<GitBranches>(EMPTY);
  const [graph, setGraph] = useState<CG>(EMPTY_GRAPH);
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [view, setView] = useState<View>("graph");

  useEffect(() => {
    if (!workdir) {
      setData(EMPTY);
      setGraph(EMPTY_GRAPH);
      return;
    }
    let cancelled = false;
    const refresh = async () => {
      const [b, g] = await Promise.all([
        safeIpc(() => ipc.gitBranches(workdir), EMPTY),
        safeIpc(() => ipc.gitCommitGraph(workdir, 300), EMPTY_GRAPH),
      ]);
      if (!cancelled) {
        setData(b);
        setGraph(g);
      }
    };
    refresh();
    const id = window.setInterval(refresh, 4000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [workdir]);

  const localTree = useMemo(() => buildTree(data.local), [data.local]);

  const toggle = (key: string) => {
    setCollapsed((s) => {
      const n = new Set(s);
      if (n.has(key)) n.delete(key);
      else n.add(key);
      return n;
    });
  };

  if (!workdir) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--ink-faint)" }}>
        No workspace open.
      </div>
    );
  }

  if (!data.current && data.local.length === 0 && data.remotes.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--ink-faint)" }}>
        Not a git repository.
        <br />
        Use Claude (<span className="kbd">⌘J</span>) to <code style={{ fontFamily: "var(--font-mono)" }}>git init</code>.
      </div>
    );
  }

  const currentBranchInfo = data.local.find((b) => b.is_current) ?? null;

  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>
      {/* current branch header */}
      <div
        style={{
          padding: "8px 12px",
          background: "var(--paper-2)",
          borderBottom: "1px dashed var(--rule)",
          display: "flex",
          flexDirection: "column",
          gap: 2,
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
          <Glyph name="branch" size={12} color="var(--accent)" />
          <span style={{ fontWeight: 700, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis" }}>
            {data.detached ? `(detached @ ${data.head_short})` : data.current || "HEAD"}
          </span>
        </div>
        {currentBranchInfo && (currentBranchInfo.ahead > 0 || currentBranchInfo.behind > 0) && (
          <div style={{ fontSize: 11, color: "var(--ink-faint)", fontFamily: "var(--font-mono)" }}>
            {currentBranchInfo.ahead > 0 && <>↑ {currentBranchInfo.ahead} ahead </>}
            {currentBranchInfo.behind > 0 && <>↓ {currentBranchInfo.behind} behind</>}
          </div>
        )}
      </div>

      {/* Graph / List toggle */}
      <div
        style={{
          display: "flex",
          padding: 6,
          gap: 4,
          borderBottom: "1px dashed var(--rule)",
          flexShrink: 0,
        }}
      >
        {(["graph", "list"] as View[]).map((v) => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={clsx("sketch-btn", { primary: view === v })}
            style={{
              flex: 1,
              transform: "none",
              padding: "3px 8px",
              fontSize: 12,
              textTransform: "capitalize",
            }}
          >
            {v}
          </button>
        ))}
      </div>

      {view === "graph" ? (
        <CommitGraph data={graph} currentBranch={data.current} />
      ) : (
        <div className="no-scroll-chrome" style={{ overflow: "auto", flex: 1, minHeight: 0 }}>
          <SectionLabel>Local</SectionLabel>
          {localTree.length === 0 ? (
            <Empty />
          ) : (
            <BranchNodes nodes={localTree} depth={0} collapsed={collapsed} onToggle={toggle} />
          )}

          <SectionLabel>Remotes</SectionLabel>
          {data.remotes.length === 0 ? (
            <Empty />
          ) : (
            data.remotes.map((r) => (
              <RemoteSection key={r.name} group={r} collapsed={collapsed} onToggle={toggle} />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="hand-label"
      style={{
        fontSize: 11,
        opacity: 0.7,
        textTransform: "uppercase",
        letterSpacing: 0.5,
        padding: "10px 10px 4px",
      }}
    >
      {children}
    </div>
  );
}

function Empty() {
  return (
    <div style={{ padding: "4px 14px", fontSize: 12, color: "var(--ink-faint)" }}>—</div>
  );
}

interface NodesProps {
  nodes: TreeNode[];
  depth: number;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  /** prefix applied when computing collapse keys (used for remote/local namespacing) */
  keyPrefix?: string;
}

function BranchNodes({ nodes, depth, collapsed, onToggle, keyPrefix = "" }: NodesProps) {
  return (
    <>
      {nodes.map((n) => {
        const fullKey = keyPrefix + n.key;
        return (
          <BranchTreeRow
            key={fullKey}
            node={n}
            fullKey={fullKey}
            depth={depth}
            collapsed={collapsed}
            onToggle={onToggle}
            keyPrefix={keyPrefix}
          />
        );
      })}
    </>
  );
}

interface RowProps {
  node: TreeNode;
  fullKey: string;
  depth: number;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
  keyPrefix: string;
}

function BranchTreeRow({ node, fullKey, depth, collapsed, onToggle, keyPrefix }: RowProps) {
  const isLeaf = node.branch !== null;
  const isGroup = !isLeaf;
  const isOpen = !collapsed.has(fullKey);
  const branch = node.branch;

  return (
    <>
      <div
        className={clsx("side-item")}
        style={{
          paddingLeft: 6 + depth * 14,
          cursor: isGroup ? "pointer" : "default",
          background: branch?.is_current ? "var(--accent-soft)" : undefined,
          borderLeft: branch?.is_current ? "3px solid var(--accent)" : "3px solid transparent",
          fontWeight: branch?.is_current ? 700 : undefined,
        }}
        onClick={() => {
          if (isGroup) onToggle(fullKey);
        }}
      >
        <span
          style={{
            width: 12,
            transform: isGroup && isOpen ? "rotate(90deg)" : "none",
            transition: "transform .1s",
            display: "inline-flex",
          }}
        >
          {isGroup && <Glyph name="chevron" size={10} />}
        </span>
        <span className="glyph">
          {isLeaf ? (
            <Glyph
              name={branch!.is_current ? "circle" : "dot"}
              size={branch!.is_current ? 10 : 8}
              color={branch!.is_current ? "var(--accent)" : "var(--ink-faint)"}
            />
          ) : (
            <Glyph name="folder" size={11} color="var(--ink-faint)" />
          )}
        </span>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis" }}>{node.label}</span>
        {branch && (branch.ahead > 0 || branch.behind > 0) && (
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              color: "var(--ink-faint)",
              flexShrink: 0,
            }}
          >
            {branch.ahead > 0 && `↑${branch.ahead}`}
            {branch.behind > 0 && ` ↓${branch.behind}`}
          </span>
        )}
      </div>
      {isGroup && isOpen && (
        <BranchNodes
          nodes={node.children}
          depth={depth + 1}
          collapsed={collapsed}
          onToggle={onToggle}
          keyPrefix={keyPrefix}
        />
      )}
    </>
  );
}

function RemoteSection({
  group,
  collapsed,
  onToggle,
}: {
  group: RemoteGroup;
  collapsed: Set<string>;
  onToggle: (key: string) => void;
}) {
  const tree = useMemo(() => buildTree(group.branches), [group.branches]);
  const groupKey = `remote:${group.name}/`;
  const isOpen = !collapsed.has(`remote:${group.name}`);

  return (
    <>
      <div
        className="side-item"
        style={{ paddingLeft: 6, fontWeight: 600, cursor: "pointer" }}
        onClick={() => onToggle(`remote:${group.name}`)}
      >
        <span
          style={{
            width: 12,
            transform: isOpen ? "rotate(90deg)" : "none",
            transition: "transform .1s",
            display: "inline-flex",
          }}
        >
          <Glyph name="chevron" size={10} />
        </span>
        <span className="glyph">
          <Glyph name="folder" size={11} color="var(--ink-faint)" />
        </span>
        <span style={{ flex: 1 }}>{group.name}</span>
      </div>
      {isOpen && (
        <BranchNodes nodes={tree} depth={1} collapsed={collapsed} onToggle={onToggle} keyPrefix={groupKey} />
      )}
    </>
  );
}
