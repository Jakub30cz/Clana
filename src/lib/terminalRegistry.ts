/**
 *  Terminal/PTY registry — keeps xterm Terminal instances and their
 *  underlying PTY listeners alive across React unmount/remount cycles.
 *
 *  Pane reorder unmounts and remounts the React tree at the new layout
 *  position, which would otherwise dispose the xterm and kill the PTY,
 *  wiping out the user's shell history (or, more importantly, their
 *  Claude chat). By keeping the xterm DOM container in JS memory and
 *  re-parenting it when TerminalPane mounts, the same Terminal instance
 *  survives any number of layout shuffles.
 *
 *  An entry is only disposed when its pane id has truly disappeared from
 *  the pane tree (user closed the pane). Reorders never dispose.
 */

import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import { ipc, safeIpc } from "@/lib/ipc";

interface TerminalEntry {
  term: Terminal;
  fit: FitAddon;
  /** Detached div that xterm renders into. Re-parented to the active
   *  TerminalPane's host on mount, removed on unmount. Never destroyed
   *  until the pane is closed. */
  container: HTMLDivElement;
  unlistenData: UnlistenFn | null;
  unlistenExit: UnlistenFn | null;
  prefilled: boolean;
  kind: "shell" | "claude";
}

const registry = new Map<string, TerminalEntry>();

function readVar(name: string, fallback: string): string {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

// ANSI palettes tuned for legibility against light vs dark backgrounds.
// Hardcoded values prevent dark-on-dark when CSS-only colors would clash.
const LIGHT_ANSI = {
  red: "#c03c3c",
  green: "#3a8a3a",
  yellow: "#b58900",
  blue: "#1c6dd0",
  magenta: "#a64ea6",
  cyan: "#2f8a8a",
  brightRed: "#e05050",
  brightGreen: "#5aa05a",
  brightYellow: "#e09a30",
  brightBlue: "#3a7ec0",
  brightMagenta: "#c66ec6",
  brightCyan: "#4eaeae",
};

const DARK_ANSI = {
  red: "#ff6b6b",
  green: "#7ee787",
  yellow: "#f1fa8c",
  blue: "#79b8ff",
  magenta: "#ff79c6",
  cyan: "#8be9fd",
  brightRed: "#ff8a8a",
  brightGreen: "#a8f0a8",
  brightYellow: "#fff39c",
  brightBlue: "#a8d3ff",
  brightMagenta: "#ffa3d9",
  brightCyan: "#b3f1ff",
};

function buildXtermTheme(mode: "light" | "dark") {
  const paper = readVar("--paper", mode === "dark" ? "#1a1a1c" : "#f7f3ea");
  const ink = readVar("--ink", mode === "dark" ? "#e8e6e0" : "#1f1d1a");
  const inkSoft = readVar("--ink-soft", mode === "dark" ? "#b8b5ad" : "#4a463f");
  const inkFaint = readVar("--ink-faint", mode === "dark" ? "#6a6760" : "#8a857a");
  const ansi = mode === "dark" ? DARK_ANSI : LIGHT_ANSI;
  return {
    background: paper,
    foreground: ink,
    cursor: ink,
    cursorAccent: paper,
    black: mode === "dark" ? inkFaint : ink,
    red: ansi.red,
    green: ansi.green,
    yellow: ansi.yellow,
    blue: ansi.blue,
    magenta: ansi.magenta,
    cyan: ansi.cyan,
    white: inkSoft,
    brightBlack: mode === "dark" ? inkSoft : inkFaint,
    brightRed: ansi.brightRed,
    brightGreen: ansi.brightGreen,
    brightYellow: ansi.brightYellow,
    brightBlue: ansi.brightBlue,
    brightMagenta: ansi.brightMagenta,
    brightCyan: ansi.brightCyan,
    brightWhite: ink,
    selectionBackground: readVar("--accent-soft", "rgba(255,165,80,0.3)"),
  };
}

export async function getOrCreateTerminal(
  paneId: string,
  kind: "shell" | "claude",
  cwd: string,
  mode: "light" | "dark" = "light",
): Promise<TerminalEntry> {
  const existing = registry.get(paneId);
  if (existing) return existing;

  const container = document.createElement("div");
  container.style.width = "100%";
  container.style.height = "100%";

  const term = new Terminal({
    fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace',
    fontSize: 12,
    cursorBlink: true,
    theme: buildXtermTheme(mode),
  });
  const fit = new FitAddon();
  term.loadAddon(fit);
  term.open(container);

  const entry: TerminalEntry = {
    term,
    fit,
    container,
    unlistenData: null,
    unlistenExit: null,
    prefilled: false,
    kind,
  };
  registry.set(paneId, entry);

  // Wire input → PTY and resize → PTY.
  term.onData((d) => {
    void safeIpc(() => ipc.ptyWrite(paneId, d), undefined);
  });
  term.onResize(({ cols, rows }) => {
    void safeIpc(() => ipc.ptyResize(paneId, cols, rows), undefined);
  });

  // Spawn the PTY on the Rust side.
  await safeIpc(
    () =>
      ipc.ptySpawn({
        id: paneId,
        cwd,
        kind,
        cols: Math.max(term.cols || 80, 40),
        rows: Math.max(term.rows || 24, 10),
      }),
    undefined,
  );

  // Forward output from PTY → xterm.
  entry.unlistenData = await listen<{ id: string; data: string }>("pty:data", (ev) => {
    if (ev.payload.id === paneId) term.write(ev.payload.data);
  });
  entry.unlistenExit = await listen<{ id: string }>("pty:exit", (ev) => {
    if (ev.payload.id === paneId) term.writeln("\r\n[process exited]");
  });

  return entry;
}

export function disposeTerminal(paneId: string): void {
  const entry = registry.get(paneId);
  if (!entry) return;
  entry.unlistenData?.();
  entry.unlistenExit?.();
  void safeIpc(() => ipc.ptyKill(paneId), undefined);
  entry.term.dispose();
  entry.container.remove();
  registry.delete(paneId);
}

export function getTerminal(paneId: string): TerminalEntry | undefined {
  return registry.get(paneId);
}

export function activeTerminalIds(): string[] {
  return Array.from(registry.keys());
}

/** Re-apply theme to all live xterm instances. Called by App when the user
 *  switches color theme or light/dark mode at runtime. xterm.js supports
 *  hot theme updates via the `options.theme` setter. */
export function refreshAllTerminalThemes(mode: "light" | "dark"): void {
  const next = buildXtermTheme(mode);
  for (const entry of registry.values()) {
    entry.term.options.theme = next;
  }
}
