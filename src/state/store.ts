import { create } from "zustand";
import { persist } from "zustand/middleware";
import { produce } from "immer";
import {
  PaneNode,
  PaneLeaf,
  LeafKind,
  closeInTree,
  splitInTree,
  firstLeaf,
  makeLeaf,
  setRatioInTree,
  findLeaf,
  replaceLeafInTree,
} from "@/lib/paneTree";
import { initialTreeFor, LayoutMode } from "@/state/layouts";

export type AccentName = "amber" | "teal" | "rose" | "green" | "violet";
export type SidePanel = "files" | "git" | "search" | "settings" | null;

interface OpenFile {
  path: string;
  name: string;
  contents: string;
  dirty: boolean;
}

interface PersistedSlice {
  layout: LayoutMode;
  accent: AccentName;
  workdir: string;
  sidePanel: SidePanel;
}

interface State extends PersistedSlice {
  tree: PaneNode;
  activePaneId: string;
  openFiles: Record<string, OpenFile>;
  paletteOpen: boolean;
  layoutMenuOpen: boolean;

  // pane mutations
  setTree: (tree: PaneNode) => void;
  setActivePane: (id: string) => void;
  closePane: (id: string) => void;
  splitPane: (id: string, dir: "h" | "v", kind?: LeafKind, opts?: { filePath?: string; name?: string }) => string;
  setSplitRatio: (path: number[], ratio: number) => void;

  // editor / files
  openFileInPane: (paneId: string, path: string, name: string, contents: string) => void;
  setFileContents: (path: string, contents: string) => void;
  markFileSaved: (path: string) => void;

  // ui
  setLayout: (m: LayoutMode) => void;
  setAccent: (a: AccentName) => void;
  setSidePanel: (p: SidePanel) => void;
  setPaletteOpen: (b: boolean) => void;
  setLayoutMenuOpen: (b: boolean) => void;
  setWorkdir: (w: string) => void;

  // helper
  getActiveLeaf: () => PaneLeaf | null;
}

const initialLayout: LayoutMode = "classic";
const initialTree = initialTreeFor(initialLayout);

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tree: initialTree,
      activePaneId: firstLeaf(initialTree).id,
      openFiles: {},
      layout: initialLayout,
      accent: "amber",
      workdir: "",
      sidePanel: "files",
      paletteOpen: false,
      layoutMenuOpen: false,

      setTree: (tree) => set({ tree }),
      setActivePane: (id) => set({ activePaneId: id }),
      closePane: (id) =>
        set((s) => {
          const next = closeInTree(s.tree, id) ?? initialTreeFor(s.layout);
          const stillThere = findLeaf(next, s.activePaneId);
          return {
            tree: next,
            activePaneId: stillThere ? s.activePaneId : firstLeaf(next).id,
          };
        }),
      splitPane: (id, dir, kind = "shell", opts = {}) => {
        const leaf = makeLeaf(kind, opts);
        set((s) => ({ tree: splitInTree(s.tree, id, dir, leaf), activePaneId: leaf.id }));
        return leaf.id;
      },
      setSplitRatio: (path, ratio) => set((s) => ({ tree: setRatioInTree(s.tree, path, ratio) })),

      openFileInPane: (paneId, path, name, contents) =>
        set((s) => ({
          tree: replaceLeafInTree(s.tree, paneId, (l) => ({
            ...l,
            kind: "editor",
            name,
            filePath: path,
          })),
          openFiles: produce(s.openFiles, (d) => {
            d[path] = { path, name, contents, dirty: false };
          }),
        })),

      setFileContents: (path, contents) =>
        set((s) => ({
          openFiles: produce(s.openFiles, (d) => {
            const f = d[path];
            if (f) {
              f.contents = contents;
              f.dirty = true;
            }
          }),
        })),

      markFileSaved: (path) =>
        set((s) => ({
          openFiles: produce(s.openFiles, (d) => {
            if (d[path]) d[path].dirty = false;
          }),
        })),

      setLayout: (m) =>
        set(() => {
          const tree = initialTreeFor(m);
          return { layout: m, tree, activePaneId: firstLeaf(tree).id };
        }),
      setAccent: (a) => set({ accent: a }),
      setSidePanel: (p) => set({ sidePanel: p }),
      setPaletteOpen: (b) => set({ paletteOpen: b }),
      setLayoutMenuOpen: (b) => set({ layoutMenuOpen: b }),
      setWorkdir: (w) => set({ workdir: w }),

      getActiveLeaf: () => {
        const { tree, activePaneId } = get();
        return findLeaf(tree, activePaneId);
      },
    }),
    {
      name: "clauna-ui",
      partialize: (s): PersistedSlice => ({
        layout: s.layout,
        accent: s.accent,
        workdir: s.workdir,
        sidePanel: s.sidePanel,
      }),
    }
  )
);

export const ACCENTS: Record<AccentName, string> = {
  amber: "oklch(0.68 0.16 50)",
  teal: "oklch(0.65 0.13 200)",
  rose: "oklch(0.65 0.16 20)",
  green: "oklch(0.65 0.14 145)",
  violet: "oklch(0.62 0.16 290)",
};

export const ACCENT_SOFT: Record<AccentName, string> = {
  amber: "oklch(0.92 0.05 60)",
  teal: "oklch(0.92 0.04 200)",
  rose: "oklch(0.92 0.05 20)",
  green: "oklch(0.93 0.05 145)",
  violet: "oklch(0.93 0.05 290)",
};
