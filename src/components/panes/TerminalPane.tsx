import { useEffect, useRef } from "react";
import { Terminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { listen, UnlistenFn } from "@tauri-apps/api/event";
import "xterm/css/xterm.css";
import { Glyph } from "@/lib/glyphs";
import { PaneLeaf } from "@/lib/paneTree";
import { ipc, safeIpc } from "@/lib/ipc";
import { useStore } from "@/state/store";

interface Props {
  pane: PaneLeaf;
  kind: "shell" | "claude";
}

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

export function TerminalPane({ pane, kind }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const prefillTimerRef = useRef<number | null>(null);
  const workdir = useStore((s) => s.workdir);
  const theme = useStore((s) => s.theme);
  const mode = useStore((s) => s.mode);
  const claudePrefill = useStore((s) => s.claudePrefill);

  useEffect(() => {
    if (!ref.current) return;
    const term = new Terminal({
      fontFamily: 'var(--font-mono), "JetBrains Mono", ui-monospace, monospace',
      fontSize: 12,
      cursorBlink: true,
      theme: buildXtermTheme(),
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(ref.current);

    termRef.current = term;
    fitRef.current = fit;

    let unlistenData: UnlistenFn | null = null;
    let unlistenExit: UnlistenFn | null = null;

    const start = async () => {
      try {
        fit.fit();
      } catch {
        /* webview not yet sized */
      }
      const { cols, rows } = term;
      const cwd = workdir || (await safeIpc(async () => "", "")) || ".";

      await safeIpc(
        () =>
          ipc.ptySpawn({
            id: pane.id,
            cwd,
            kind,
            cols: Math.max(cols, 40),
            rows: Math.max(rows, 10),
          }),
        undefined
      );

      unlistenData = await listen<{ id: string; data: string }>("pty:data", (ev) => {
        if (ev.payload.id === pane.id) term.write(ev.payload.data);
      });
      unlistenExit = await listen<{ id: string }>("pty:exit", (ev) => {
        if (ev.payload.id === pane.id) term.writeln("\r\n[process exited]");
      });
      term.onData((d) => {
        safeIpc(() => ipc.ptyWrite(pane.id, d), undefined);
      });
      term.onResize(({ cols, rows }) => {
        safeIpc(() => ipc.ptyResize(pane.id, cols, rows), undefined);
      });

      // Pre-fill Claude with workspace context — typed into the prompt
      // (no newline, so the user can hit Enter to send or backspace to drop).
      if (kind === "claude" && claudePrefill && cwd && cwd !== ".") {
        const name = cwd.replace(/[\\/]+$/, "").split(/[\\/]/).pop() || cwd;
        const msg = `Pracuju ve workspace "${name}" (${cwd}). `;
        const t = window.setTimeout(() => {
          safeIpc(() => ipc.ptyWrite(pane.id, msg), undefined);
        }, 1800);
        prefillTimerRef.current = t;
      }
    };

    start();

    const ro = new ResizeObserver(() => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    });
    ro.observe(ref.current);

    return () => {
      ro.disconnect();
      if (prefillTimerRef.current != null) {
        window.clearTimeout(prefillTimerRef.current);
        prefillTimerRef.current = null;
      }
      unlistenData?.();
      unlistenExit?.();
      safeIpc(() => ipc.ptyKill(pane.id), undefined);
      term.dispose();
    };
  }, [pane.id, kind, workdir, theme, mode, claudePrefill]);

  const accent = kind === "claude";
  return (
    <div style={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0, background: "var(--paper)" }}>
      <div
        style={{
          padding: "4px 12px",
          fontFamily: "var(--hand)",
          fontSize: 12,
          background: "var(--paper-2)",
          borderBottom: "1px dashed var(--rule)",
          display: "flex",
          alignItems: "center",
          gap: 8,
          color: "var(--ink-soft)",
          flexShrink: 0,
        }}
      >
        <Glyph name={accent ? "sparkle" : "terminal"} size={12} color={accent ? "var(--accent)" : "var(--ink-soft)"} />
        <span style={{ color: accent ? "var(--accent)" : "var(--ink)", fontWeight: accent ? 700 : 500 }}>
          {accent ? "claude" : pane.name}
        </span>
        <span style={{ flex: 1 }} />
        <span className="kbd">{accent ? "⌘J" : "⌃`"}</span>
      </div>
      <div ref={ref} style={{ flex: 1, minHeight: 0, padding: 4 }} />
    </div>
  );
}
