import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { produce } from "immer";
import { getCurrentWebviewWindow } from "@tauri-apps/api/webviewWindow";
import {
  PaneNode,
  PaneLeaf,
  LeafKind,
  closeInTree,
  splitInTree,
  firstLeaf,
  firstEditorLeaf,
  findLeafBy,
  makeLeaf,
  setRatioInTree,
  findLeaf,
  replaceLeafInTree,
  movePaneInTree,
  moveLeafToEdge,
  type DropZone,
} from "@/lib/paneTree";
import { initialTreeFor, LayoutMode } from "@/state/layouts";

export type AccentName = "blue" | "amber" | "teal" | "rose" | "green" | "violet";
export type SidePanel = "files" | "git" | "search" | "settings" | null;
export type ThemeName = "sketch" | "clean" | "mono" | "serif";
export type ColorMode = "light" | "dark" | "auto";
export type { SyntaxPalette } from "@/lib/editorTheme";
import type { SyntaxPalette } from "@/lib/editorTheme";

export interface WorkspaceFile {
  /** abs path to the .clana-workspace.json on disk; undefined = unsaved */
  filePath?: string;
  /** display name; falls back to file basename or "Untitled Workspace" */
  name?: string;
  folders: string[];
}

export type RecentEntry =
  | { kind: "folder"; path: string; name: string; lastOpenedAt: number }
  | { kind: "workspace"; filePath: string; name: string; lastOpenedAt: number };

interface OpenFile {
  path: string;
  name: string;
  contents: string;
  dirty: boolean;
}

interface PersistedSlice {
  layout: LayoutMode;
  accent: AccentName;
  theme: ThemeName;
  mode: ColorMode;
  syntaxPalette: SyntaxPalette;
  sidebarWidth: number;
  workdir: string;
  workspace: WorkspaceFile | null;
  sidePanel: SidePanel;
  recentEntries: RecentEntry[];
  claudePrefill: boolean;
}

interface State extends PersistedSlice {
  tree: PaneNode;
  activePaneId: string;
  /** Last pane that had focus AND was an editor. Used to route file-opens away from terminals/claude. */
  lastEditorPaneId: string | null;
  openFiles: Record<string, OpenFile>;
  paletteOpen: boolean;
  layoutMenuOpen: boolean;

  // pane mutations
  setTree: (tree: PaneNode) => void;
  setActivePane: (id: string) => void;
  closePane: (id: string) => void;
  splitPane: (id: string, dir: "h" | "v", kind?: LeafKind, opts?: { filePath?: string; name?: string }) => string;
  setSplitRatio: (path: number[], ratio: number) => void;
  movePane: (fromId: string, toId: string, zone: DropZone) => void;
  movePaneToEdge: (id: string, edge: "top" | "bottom" | "left" | "right") => void;

  // editor / files
  /** Smart open: route to existing tab → last editor pane → first editor leaf. Never replaces a terminal/claude. */
  openFile: (path: string, name: string, contents: string) => void;
  /** Explicit target — used by drag-drop onto a specific editor pane. Adds as a tab. */
  openFileInPane: (paneId: string, path: string, name: string, contents: string) => void;
  closeFileInPane: (paneId: string, path: string) => void;
  setActiveTab: (paneId: string, path: string) => void;
  setFileContents: (path: string, contents: string) => void;
  markFileSaved: (path: string) => void;

  // ui
  setLayout: (m: LayoutMode) => void;
  setAccent: (a: AccentName) => void;
  setTheme: (t: ThemeName) => void;
  setMode: (m: ColorMode) => void;
  setSyntaxPalette: (p: SyntaxPalette) => void;
  setSidebarWidth: (w: number) => void;
  setSidePanel: (p: SidePanel) => void;
  setPaletteOpen: (b: boolean) => void;
  setLayoutMenuOpen: (b: boolean) => void;
  setClaudePrefill: (b: boolean) => void;

  // workspaces
  openFolder: (path: string) => void;
  openWorkspaceFile: (filePath: string, file: WorkspaceFile) => void;
  addFoldersToWorkspace: (paths: string[]) => void;
  removeFolderFromWorkspace: (path: string) => void;
  setWorkspaceMeta: (filePath: string, name?: string) => void;
  closeFolder: () => void;
  removeRecentEntry: (key: string) => void;
  clearRecentEntries: () => void;

  // helpers
  getActiveLeaf: () => PaneLeaf | null;
  getActiveFolders: () => string[];
  getPrimaryFolder: () => string;
  hasAnyFolder: () => boolean;
}

const initialLayout: LayoutMode = "classic";
const initialTree = initialTreeFor(initialLayout);

const myWindowLabel = (() => {
  try {
    return getCurrentWebviewWindow().label;
  } catch {
    return "main";
  }
})();
const isMainWindow = myWindowLabel === "main";
const persistKeyName = isMainWindow ? "clana-ui" : `clana-ui:${myWindowLabel}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      tree: initialTree,
      activePaneId: firstLeaf(initialTree).id,
      lastEditorPaneId: firstEditorLeaf(initialTree)?.id ?? null,
      openFiles: {},
      layout: initialLayout,
      accent: "blue",
      theme: "clean",
      mode: "dark",
      syntaxPalette: "cool",
      sidebarWidth: 260,
      workdir: "",
      workspace: null,
      sidePanel: "files",
      recentEntries: [],
      claudePrefill: true,
      paletteOpen: false,
      layoutMenuOpen: false,

      setTree: (tree) => set({ tree }),
      setActivePane: (id) =>
        set((s) => {
          const leaf = findLeaf(s.tree, id);
          return {
            activePaneId: id,
            lastEditorPaneId: leaf?.kind === "editor" ? id : s.lastEditorPaneId,
          };
        }),
      closePane: (id) =>
        set((s) => {
          const next = closeInTree(s.tree, id) ?? initialTreeFor(s.layout);
          const stillThere = findLeaf(next, s.activePaneId);
          const lastEditorStillThere = s.lastEditorPaneId && findLeaf(next, s.lastEditorPaneId);
          return {
            tree: next,
            activePaneId: stillThere ? s.activePaneId : firstLeaf(next).id,
            lastEditorPaneId: lastEditorStillThere ? s.lastEditorPaneId : firstEditorLeaf(next)?.id ?? null,
          };
        }),
      splitPane: (id, dir, kind = "shell", opts = {}) => {
        const leaf = makeLeaf(kind, opts);
        set((s) => ({ tree: splitInTree(s.tree, id, dir, leaf), activePaneId: leaf.id }));
        return leaf.id;
      },
      setSplitRatio: (path, ratio) => set((s) => ({ tree: setRatioInTree(s.tree, path, ratio) })),
      movePane: (fromId, toId, zone) =>
        set((s) => {
          const next = movePaneInTree(s.tree, fromId, toId, zone);
          if (next === s.tree) return {};
          return { tree: next, activePaneId: fromId };
        }),
      movePaneToEdge: (id, edge) =>
        set((s) => {
          const next = moveLeafToEdge(s.tree, id, edge);
          if (next === s.tree) return {};
          return { tree: next, activePaneId: id };
        }),

      openFile: (path, name, contents) =>
        set((s) => {
          const existing = findLeafBy(s.tree, (l) => l.kind === "editor" && (l.tabs?.includes(path) ?? false));
          if (existing) {
            return {
              tree: replaceLeafInTree(s.tree, existing.id, (l) => ({
                ...l,
                activeTab: path,
                name,
              })),
              activePaneId: existing.id,
              lastEditorPaneId: existing.id,
              openFiles: s.openFiles[path]
                ? s.openFiles
                : produce(s.openFiles, (d) => {
                    d[path] = { path, name, contents, dirty: false };
                  }),
            };
          }
          let target: PaneLeaf | null = null;
          if (s.lastEditorPaneId) {
            const leaf = findLeaf(s.tree, s.lastEditorPaneId);
            if (leaf?.kind === "editor") target = leaf;
          }
          if (!target) target = firstEditorLeaf(s.tree);

          // No editor pane exists at all (e.g. user has only terminals/Claude
          // open). Split a sibling pane so the file can land in a fresh editor
          // without nuking the terminal they were just using.
          if (!target) {
            const sibling = findLeaf(s.tree, s.activePaneId) ?? firstLeaf(s.tree);
            const newLeaf = makeLeaf("editor", { filePath: path, name });
            return {
              tree: splitInTree(s.tree, sibling.id, "h", newLeaf),
              activePaneId: newLeaf.id,
              lastEditorPaneId: newLeaf.id,
              openFiles: produce(s.openFiles, (d) => {
                if (!d[path]) d[path] = { path, name, contents, dirty: false };
              }),
            };
          }

          const targetId = target.id;
          return {
            tree: replaceLeafInTree(s.tree, targetId, (l) => ({
              ...l,
              tabs: [...(l.tabs ?? []), path],
              activeTab: path,
              name,
            })),
            activePaneId: targetId,
            lastEditorPaneId: targetId,
            openFiles: produce(s.openFiles, (d) => {
              if (!d[path]) d[path] = { path, name, contents, dirty: false };
            }),
          };
        }),

      openFileInPane: (paneId, path, name, contents) =>
        set((s) => ({
          tree: replaceLeafInTree(s.tree, paneId, (l) => {
            const tabs = l.tabs ?? [];
            const next = tabs.includes(path) ? tabs : [...tabs, path];
            return { ...l, kind: "editor", name, tabs: next, activeTab: path };
          }),
          openFiles: produce(s.openFiles, (d) => {
            if (!d[path]) d[path] = { path, name, contents, dirty: false };
          }),
          activePaneId: paneId,
          lastEditorPaneId: paneId,
        })),

      closeFileInPane: (paneId, path) =>
        set((s) => ({
          tree: replaceLeafInTree(s.tree, paneId, (l) => {
            if (l.kind !== "editor") return l;
            const tabs = l.tabs ?? [];
            if (!tabs.includes(path)) return l;
            const idx = tabs.indexOf(path);
            const nextTabs = tabs.filter((t) => t !== path);
            const wasActive = l.activeTab === path;
            const nextActive = wasActive ? nextTabs[idx] ?? nextTabs[idx - 1] ?? undefined : l.activeTab;
            const nextName = nextActive ? basenameOf(nextActive) : "untitled";
            return { ...l, tabs: nextTabs, activeTab: nextActive, name: nextName };
          }),
        })),

      setActiveTab: (paneId, path) =>
        set((s) => ({
          tree: replaceLeafInTree(s.tree, paneId, (l) => {
            if (l.kind !== "editor" || !(l.tabs?.includes(path))) return l;
            return { ...l, activeTab: path, name: basenameOf(path) };
          }),
          activePaneId: paneId,
          lastEditorPaneId: paneId,
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
          return {
            layout: m,
            tree,
            activePaneId: firstLeaf(tree).id,
            lastEditorPaneId: firstEditorLeaf(tree)?.id ?? null,
          };
        }),
      setAccent: (a) => set({ accent: a }),
      setTheme: (t) => set({ theme: t }),
      setMode: (m) => set({ mode: m }),
      setSyntaxPalette: (p) => set({ syntaxPalette: p }),
      setSidebarWidth: (w) => set({ sidebarWidth: w }),
      setSidePanel: (p) => set({ sidePanel: p }),
      setPaletteOpen: (b) => set({ paletteOpen: b }),
      setLayoutMenuOpen: (b) => set({ layoutMenuOpen: b }),
      setClaudePrefill: (b) => set({ claudePrefill: b }),

      openFolder: (path) =>
        set((s) => {
          const name = basenameOf(path);
          const entry: RecentEntry = { kind: "folder", path, name, lastOpenedAt: Date.now() };
          return {
            workdir: path,
            workspace: null,
            recentEntries: pushRecent(s.recentEntries, entry, recentKey(entry)),
            openFiles: {},
          };
        }),

      openWorkspaceFile: (filePath, file) =>
        set((s) => {
          const name = file.name || stripWorkspaceExt(basenameOf(filePath)) || "Untitled Workspace";
          const ws: WorkspaceFile = { ...file, filePath, name };
          const entry: RecentEntry = {
            kind: "workspace",
            filePath,
            name,
            lastOpenedAt: Date.now(),
          };
          return {
            workdir: "",
            workspace: ws,
            recentEntries: pushRecent(s.recentEntries, entry, recentKey(entry)),
            openFiles: {},
          };
        }),

      addFoldersToWorkspace: (paths) =>
        set((s) => {
          const fresh = paths.filter(Boolean);
          if (!fresh.length) return {};

          // Workspace mode: append unique folders
          if (s.workspace) {
            const existing = new Set(s.workspace.folders);
            const merged = [...s.workspace.folders];
            for (const p of fresh) if (!existing.has(p)) merged.push(p);
            if (merged.length === s.workspace.folders.length) return {};
            return { workspace: { ...s.workspace, folders: merged } };
          }

          // Single-folder mode: promote to unsaved workspace
          if (s.workdir) {
            const all = [s.workdir, ...fresh.filter((p) => p !== s.workdir)];
            if (all.length < 2) return {};
            return {
              workdir: "",
              workspace: { folders: all, name: "Untitled Workspace" },
              openFiles: {},
            };
          }

          // Empty: single folder → single-folder mode; multiple → workspace
          if (fresh.length === 1) {
            const path = fresh[0];
            const name = basenameOf(path);
            const entry: RecentEntry = {
              kind: "folder",
              path,
              name,
              lastOpenedAt: Date.now(),
            };
            return {
              workdir: path,
              workspace: null,
              recentEntries: pushRecent(s.recentEntries, entry, recentKey(entry)),
              openFiles: {},
            };
          }
          return {
            workdir: "",
            workspace: { folders: fresh, name: "Untitled Workspace" },
            openFiles: {},
          };
        }),

      removeFolderFromWorkspace: (path) =>
        set((s) => {
          if (!s.workspace) return {};
          const folders = s.workspace.folders.filter((p) => p !== path);
          if (folders.length === 0) return { workspace: null, workdir: "", openFiles: {} };
          if (folders.length === 1) {
            return { workspace: null, workdir: folders[0], openFiles: {} };
          }
          return { workspace: { ...s.workspace, folders } };
        }),

      setWorkspaceMeta: (filePath, name) =>
        set((s) => {
          if (!s.workspace) return {};
          const finalName =
            name || s.workspace.name || stripWorkspaceExt(basenameOf(filePath)) || "Untitled Workspace";
          const ws: WorkspaceFile = { ...s.workspace, filePath, name: finalName };
          const entry: RecentEntry = {
            kind: "workspace",
            filePath,
            name: finalName,
            lastOpenedAt: Date.now(),
          };
          return {
            workspace: ws,
            recentEntries: pushRecent(s.recentEntries, entry, recentKey(entry)),
          };
        }),

      closeFolder: () => set({ workdir: "", workspace: null, openFiles: {} }),

      removeRecentEntry: (key) =>
        set((s) => ({ recentEntries: s.recentEntries.filter((r) => recentKey(r) !== key) })),
      clearRecentEntries: () => set({ recentEntries: [] }),

      getActiveLeaf: () => {
        const { tree, activePaneId } = get();
        return findLeaf(tree, activePaneId);
      },
      getActiveFolders: () => {
        const s = get();
        if (s.workspace) return s.workspace.folders;
        if (s.workdir) return [s.workdir];
        return [];
      },
      getPrimaryFolder: () => {
        const s = get();
        return s.workspace?.folders[0] ?? s.workdir ?? "";
      },
      hasAnyFolder: () => {
        const s = get();
        return Boolean(s.workspace || s.workdir);
      },
    }),
    {
      name: persistKeyName,
      storage: createJSONStorage(() => localStorage),
      version: 2,
      migrate: (state, fromVersion) => {
        const s = state as Record<string, unknown> | undefined;
        if (!s) return state;
        if (fromVersion < 1 && s.syntaxPalette === "auto") {
          s.syntaxPalette = "cool";
        }
        if (fromVersion < 2) {
          // v1 had `recentWorkspaces: { path, name, lastOpenedAt }[]` — convert to tagged entries.
          const old = (s.recentWorkspaces ?? []) as Array<{
            path: string;
            name: string;
            lastOpenedAt: number;
          }>;
          s.recentEntries = old.map(
            (r): RecentEntry => ({
              kind: "folder",
              path: r.path,
              name: r.name,
              lastOpenedAt: r.lastOpenedAt,
            })
          );
          delete s.recentWorkspaces;
          if (s.workspace === undefined) s.workspace = null;
        }
        return s;
      },
      merge: (persisted, current) => {
        let p = (persisted ?? {}) as Partial<PersistedSlice>;
        // First load of a fresh non-main window: seed prefs/recents from main's
        // persisted state, but never inherit folder/workspace (the user wants
        // new windows to start empty).
        if (!isMainWindow && Object.keys(p as object).length === 0) {
          try {
            const mainRaw = localStorage.getItem("clana-ui");
            if (mainRaw) {
              const parsed = JSON.parse(mainRaw);
              p = ((parsed.state ?? parsed) as Partial<PersistedSlice>) ?? {};
            }
          } catch {
            /* fall through with empty seed */
          }
        }
        const merged = { ...(current as object), ...(p as object) } as State;
        if (!isMainWindow) {
          merged.workdir = "";
          merged.workspace = null;
          merged.openFiles = {};
        }
        return merged;
      },
      partialize: (s): PersistedSlice => ({
        layout: s.layout,
        accent: s.accent,
        theme: s.theme,
        mode: s.mode,
        syntaxPalette: s.syntaxPalette,
        sidebarWidth: s.sidebarWidth,
        workdir: s.workdir,
        workspace: s.workspace,
        sidePanel: s.sidePanel,
        recentEntries: s.recentEntries,
        claudePrefill: s.claudePrefill,
      }),
    }
  )
);

function stripWorkspaceExt(name: string): string {
  return name.replace(/\.clana-workspace(\.json)?$/i, "");
}

export function recentKey(r: RecentEntry): string {
  return r.kind === "folder" ? `f:${r.path}` : `w:${r.filePath}`;
}

function pushRecent(list: RecentEntry[], entry: RecentEntry, key: string): RecentEntry[] {
  const filtered = list.filter((r) => recentKey(r) !== key);
  return [entry, ...filtered].slice(0, 10);
}

function basenameOf(p: string): string {
  if (!p) return "";
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}

export const ACCENTS: Record<AccentName, string> = {
  blue: "oklch(0.62 0.18 250)",
  amber: "oklch(0.68 0.16 50)",
  teal: "oklch(0.65 0.13 200)",
  rose: "oklch(0.65 0.16 20)",
  green: "oklch(0.65 0.14 145)",
  violet: "oklch(0.62 0.16 290)",
};

export const ACCENT_SOFT_LIGHT: Record<AccentName, string> = {
  blue: "oklch(0.93 0.05 250)",
  amber: "oklch(0.92 0.05 60)",
  teal: "oklch(0.92 0.04 200)",
  rose: "oklch(0.92 0.05 20)",
  green: "oklch(0.93 0.05 145)",
  violet: "oklch(0.93 0.05 290)",
};

export const ACCENT_SOFT_DARK: Record<AccentName, string> = {
  blue: "oklch(0.30 0.07 250)",
  amber: "oklch(0.30 0.07 60)",
  teal: "oklch(0.30 0.06 200)",
  rose: "oklch(0.30 0.07 20)",
  green: "oklch(0.30 0.06 145)",
  violet: "oklch(0.30 0.07 290)",
};
