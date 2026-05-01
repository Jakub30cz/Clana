export type LeafKind = "editor" | "shell" | "claude";

export interface PaneLeaf {
  type: "leaf";
  id: string;
  kind: LeafKind;
  /** for editor leaves: open file path (absolute) */
  filePath?: string;
  /** display name (file basename or terminal title) */
  name: string;
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
  return {
    type: "leaf",
    kind: "editor",
    id: newId(),
    name: opts.name ?? "untitled",
    filePath: opts.filePath,
  };
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
