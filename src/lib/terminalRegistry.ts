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

function buildXtermTheme() {
  const paper = readVar("--paper", "#f7f3ea");
  const ink = readVar("--ink", "#1f1d1a");
  const inkSoft = readVar("--ink-soft", "#4a463f");
  const inkFaint = readVar("--ink-faint", "#8a857a");
  const accent = readVar("--accent", "#c87a14");
  const accent2 = readVar("--accent-2", "#3a7ec0");
  return {
    background: paper,
    foreground: ink,
    cursor: ink,
    cursorAccent: paper,
    black: ink,
    red: "#c03c3c",
    green: "#3a8a3a",
    yellow: accent,
    blue: accent2,
    magenta: "#a64ea6",
    cyan: "#2f8a8a",
    white: inkSoft,
    brightBlack: inkFaint,
    brightRed: "#e05050",
    brightGreen: "#5aa05a",
    brightYellow: "#e09a30",
    brightBlue: "#5a9ad6",
    brightMagenta: "#c66ec6",
    brightCyan: "#4eaeae",
    brightWhite: ink,
    selectionBackground: readVar("--accent-soft", "rgba(255,165,80,0.3)"),
  };
}

export async function getOrCreateTerminal(
  paneId: string,
  kind: "shell" | "claude",
  cwd: string,
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
    theme: buildXtermTheme(),
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
