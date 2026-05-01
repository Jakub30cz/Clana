export type LeafKind = "editor" | "shell" | "claude";

export interface PaneLeaf {
  type: "leaf";
  id: string;
  kind: LeafKind;
  /** display name (file basename or terminal title) */
  name: string;
  /** editor only: open file paths in tab order. Empty/undefined = welcome. */
  tabs?: string[];
  /** editor only: currently visible tab path. Must be in tabs if defined. */
  activeTab?: string;
}

export interface PaneSplit {
  type: "split";
  dir: "h" | "v";
  a: PaneNode;
  b: PaneNode;
  ratio: number;
}

export type PaneNode = PaneLeaf | PaneSplit;

let _idc = 1;
export const newId = () => "p" + _idc++;

export function makeLeaf(kind: LeafKind, opts: { filePath?: string; name?: string } = {}): PaneLeaf {
  if (kind === "claude") return { type: "leaf", kind, id: newId(), name: opts.name ?? "claude" };
  if (kind === "shell") return { type: "leaf", kind, id: newId(), name: opts.name ?? "zsh" };
  const tabs = opts.filePath ? [opts.filePath] : [];
  return {
    type: "leaf",
    kind: "editor",
    id: newId(),
    name: opts.name ?? "untitled",
    tabs,
    activeTab: opts.filePath,
  };
}

export function findLeafBy(node: PaneNode, fn: (leaf: PaneLeaf) => boolean): PaneLeaf | null {
  if (node.type === "leaf") return fn(node) ? node : null;
  return findLeafBy(node.a, fn) ?? findLeafBy(node.b, fn);
}

export function firstEditorLeaf(node: PaneNode): PaneLeaf | null {
  return findLeafBy(node, (l) => l.kind === "editor");
}

export function firstLeaf(node: PaneNode): PaneLeaf {
  return node.type === "leaf" ? node : firstLeaf(node.a);
}

export function findLeaf(node: PaneNode, id: string): PaneLeaf | null {
  if (node.type === "leaf") return node.id === id ? node : null;
  return findLeaf(node.a, id) ?? findLeaf(node.b, id);
}

export function closeInTree(node: PaneNode, id: string): PaneNode | null {
  if (node.type === "leaf") return node.id === id ? null : node;
  const a = closeInTree(node.a, id);
  const b = closeInTree(node.b, id);
  if (!a) return b;
  if (!b) return a;
  return { ...node, a, b };
}

export function splitInTree(node: PaneNode, id: string, dir: "h" | "v", leaf: PaneLeaf): PaneNode {
  if (node.type === "leaf") {
    if (node.id !== id) return node;
    return { type: "split", dir, a: node, b: leaf, ratio: 0.5 };
  }
  return { ...node, a: splitInTree(node.a, id, dir, leaf), b: splitInTree(node.b, id, dir, leaf) };
}

export function setRatioInTree(node: PaneNode, splitPath: number[], ratio: number): PaneNode {
  if (node.type === "leaf") return node;
  if (splitPath.length === 0) return { ...node, ratio };
  const [next, ...rest] = splitPath;
  return next === 0
    ? { ...node, a: setRatioInTree(node.a, rest, ratio) }
    : { ...node, b: setRatioInTree(node.b, rest, ratio) };
}

export function replaceLeafInTree(node: PaneNode, id: string, mut: (l: PaneLeaf) => PaneLeaf): PaneNode {
  if (node.type === "leaf") return node.id === id ? mut(node) : node;
  return { ...node, a: replaceLeafInTree(node.a, id, mut), b: replaceLeafInTree(node.b, id, mut) };
}

// ── Reorder helpers ────────────────────────────────────────────────────────

export type DropZone = "top" | "bottom" | "left" | "right" | "center";

/** Like splitInTree but lets the caller place the new leaf on the `a` side
 *  (newLeafFirst=true) or `b` side (false). The existing splitInTree always
 *  appends on the `b` side; this is the generalised version used for moves. */
export function splitInTreeAt(
  node: PaneNode,
  targetId: string,
  dir: "h" | "v",
  newLeaf: PaneLeaf,
  newLeafFirst: boolean,
): PaneNode {
  if (node.type === "leaf") {
    if (node.id !== targetId) return node;
    const a = newLeafFirst ? newLeaf : node;
    const b = newLeafFirst ? node : newLeaf;
    return { type: "split", dir, a, b, ratio: 0.5 };
  }
  return {
    ...node,
    a: splitInTreeAt(node.a, targetId, dir, newLeaf, newLeafFirst),
    b: splitInTreeAt(node.b, targetId, dir, newLeaf, newLeafFirst),
  };
}

/** Swap two leaves in place, preserving their ids. The whole leaf object
 *  (including tabs/activeTab/name) moves to the other slot. */
export function swapLeaves(node: PaneNode, idA: string, idB: string): PaneNode {
  const leafA = findLeaf(node, idA);
  const leafB = findLeaf(node, idB);
  if (!leafA || !leafB || leafA.id === leafB.id) return node;
  return substituteLeaves(node, leafA, leafB);
}

function substituteLeaves(node: PaneNode, leafA: PaneLeaf, leafB: PaneLeaf): PaneNode {
  if (node.type === "leaf") {
    if (node.id === leafA.id) return leafB;
    if (node.id === leafB.id) return leafA;
    return node;
  }
  return {
    ...node,
    a: substituteLeaves(node.a, leafA, leafB),
    b: substituteLeaves(node.b, leafA, leafB),
  };
}

/** Move a leaf to an outer edge of the entire layout — wraps the rest of
 *  the tree in a new top-level split. Used by the right-click "Move to Top /
 *  Bottom / Left / Right" actions. */
export function moveLeafToEdge(
  tree: PaneNode,
  leafId: string,
  edge: "top" | "bottom" | "left" | "right",
): PaneNode {
  const source = findLeaf(tree, leafId);
  if (!source) return tree;
  const without = closeInTree(tree, leafId);
  if (!without) return tree;
  const dir: "h" | "v" = edge === "left" || edge === "right" ? "h" : "v";
  const sourceFirst = edge === "top" || edge === "left";
  return {
    type: "split",
    dir,
    a: sourceFirst ? source : without,
    b: sourceFirst ? without : source,
    ratio: 0.35,
  };
}

/** Flatten the tree into a list of leaves in depth-first order. Useful for
 *  building "Swap with…" menus that list every other pane. */
export function listLeaves(node: PaneNode): PaneLeaf[] {
  if (node.type === "leaf") return [node];
  return [...listLeaves(node.a), ...listLeaves(node.b)];
}

/** VS Code-style move: detach `fromId`, reattach at `toId` according to zone.
 *  - `top`/`left`: source becomes the leading side of a new split with target.
 *  - `bottom`/`right`: source becomes the trailing side.
 *  - `center`: swap source and target in place.
 *
 *  Returns the input tree unchanged on no-ops (drop on self, missing leaves). */
export function movePaneInTree(
  tree: PaneNode,
  fromId: string,
  toId: string,
  zone: DropZone,
): PaneNode {
  if (fromId === toId) return tree;
  const source = findLeaf(tree, fromId);
  const target = findLeaf(tree, toId);
  if (!source || !target) return tree;
  if (zone === "center") {
    return swapLeaves(tree, fromId, toId);
  }
  // Detach the source from its current spot. closeInTree collapses the
  // surrounding split — toId is unaffected because closeInTree only removes
  // the matching leaf, leaving siblings (including the target) in place.
  const without = closeInTree(tree, fromId);
  if (!without) return tree;
  const dir: "h" | "v" = zone === "left" || zone === "right" ? "h" : "v";
  const sourceFirst = zone === "top" || zone === "left";
  return splitInTreeAt(without, toId, dir, source, sourceFirst);
}
