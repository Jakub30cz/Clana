import { useEffect, useRef } from "react";
import "xterm/css/xterm.css";
import { Glyph } from "@/lib/glyphs";
import { PaneLeaf } from "@/lib/paneTree";
import { ipc, safeIpc } from "@/lib/ipc";
import { useStore } from "@/state/store";
import { getOrCreateTerminal } from "@/lib/terminalRegistry";
import { useResolvedColorMode } from "@/lib/useResolvedColorMode";

interface Props {
  pane: PaneLeaf;
  kind: "shell" | "claude";
}

export function TerminalPane({ pane, kind }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const workdir = useStore((s) => s.workdir);
  const workspace = useStore((s) => s.workspace);
  const claudePrefill = useStore((s) => s.claudePrefill);
  const resolvedMode = useResolvedColorMode();

  useEffect(() => {
    const host = ref.current;
    if (!host) return;
    let cancelled = false;
    let ro: ResizeObserver | null = null;

    const cwd = workspace?.folders[0] || workdir || ".";

    void getOrCreateTerminal(pane.id, kind, cwd, resolvedMode).then((entry) => {
      if (cancelled) return;
      // Re-parent the persistent xterm container into our host. If the
      // pane is mounting fresh after a move, this is the first attach
      // since detach; if it's a brand-new terminal, this is the first
      // attach ever.
      host.appendChild(entry.container);
      try {
        entry.fit.fit();
      } catch {
        /* webview not yet sized */
      }

      // Prefill Claude with workspace context — only when in workspace mode
      // and only ONCE per terminal instance (so reorder doesn't re-prefill).
      if (
        !entry.prefilled &&
        kind === "claude" &&
        claudePrefill &&
        workspace &&
        workspace.folders.length > 0
      ) {
        const list = workspace.folders.map((p) => `  - ${p}`).join("\n");
        const msg = `You are working with these projects:\n${list}\n`;
        window.setTimeout(() => {
          void safeIpc(() => ipc.ptyWrite(pane.id, msg), undefined);
        }, 1800);
        entry.prefilled = true;
      }

      ro = new ResizeObserver(() => {
        try {
          entry.fit.fit();
        } catch {
          /* ignore */
        }
      });
      ro.observe(host);
    });

    return () => {
      cancelled = true;
      ro?.disconnect();
      // Detach the xterm container, but DO NOT dispose the terminal or
      // kill the PTY. The registry keeps them alive across remounts.
      // App-level subscription will dispose if the pane truly disappears.
      const existing = host.firstElementChild;
      if (existing && existing.parentNode === host) {
        host.removeChild(existing);
      }
    };
  }, [pane.id, kind, workdir, workspace, claudePrefill]);

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
