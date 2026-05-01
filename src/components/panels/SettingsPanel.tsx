import clsx from "clsx";
import { ACCENTS, AccentName, ColorMode, ThemeName, useStore } from "@/state/store";

const ACCENT_NAMES: AccentName[] = ["amber", "teal", "rose", "green", "violet"];

interface ThemeMeta {
  id: ThemeName;
  label: string;
  description: string;
  fontStack: string;
  swatchLight: { bg: string; ink: string; accent: string };
  swatchDark: { bg: string; ink: string; accent: string };
}

const THEMES: ThemeMeta[] = [
  {
    id: "sketch",
    label: "Sketch",
    description: "Handwritten paper. The original.",
    fontStack: "'Caveat', cursive",
    swatchLight: { bg: "#f7f3ea", ink: "#1f1d1a", accent: "oklch(0.68 0.16 50)" },
    swatchDark: { bg: "#1c1a16", ink: "#ece5d2", accent: "oklch(0.78 0.16 55)" },
  },
  {
    id: "clean",
    label: "Clean",
    description: "Modern minimal. Inter, no chrome.",
    fontStack: "'Inter', system-ui, sans-serif",
    swatchLight: { bg: "#ffffff", ink: "#0f0f10", accent: "#f97316" },
    swatchDark: { bg: "#0c0c0e", ink: "#f5f5f7", accent: "#fb923c" },
  },
  {
    id: "mono",
    label: "Mono",
    description: "Mono everywhere. Brutalist.",
    fontStack: "'IBM Plex Mono', monospace",
    swatchLight: { bg: "#ffffff", ink: "#000000", accent: "#ff5500" },
    swatchDark: { bg: "#0a0a0a", ink: "#ffffff", accent: "#ff7d33" },
  },
  {
    id: "serif",
    label: "Serif",
    description: "Lora. Book-like, warm.",
    fontStack: "'Lora', Georgia, serif",
    swatchLight: { bg: "#fbf8f1", ink: "#2a2520", accent: "#b45309" },
    swatchDark: { bg: "#1d1a16", ink: "#ede4d2", accent: "#d97706" },
  },
];

const MODES: { id: ColorMode; label: string; hint: string }[] = [
  { id: "light", label: "Light", hint: "☀" },
  { id: "dark", label: "Dark", hint: "☾" },
  { id: "auto", label: "Auto", hint: "⌬" },
];

export function SettingsPanel() {
  const accent = useStore((s) => s.accent);
  const setAccent = useStore((s) => s.setAccent);
  const theme = useStore((s) => s.theme);
  const setTheme = useStore((s) => s.setTheme);
  const mode = useStore((s) => s.mode);
  const setMode = useStore((s) => s.setMode);
  const claudePrefill = useStore((s) => s.claudePrefill);
  const setClaudePrefill = useStore((s) => s.setClaudePrefill);

  const previewMode: "light" | "dark" =
    mode === "auto"
      ? (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light")
      : mode;

  return (
    <div
      className="no-scroll-chrome"
      style={{ padding: "10px 12px", fontFamily: "var(--font-hand)", fontSize: 13, overflow: "auto", flex: 1 }}
    >
      <div className="hand-title" style={{ fontSize: 18, marginBottom: 8 }}>Settings</div>

      <Group label="Appearance">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {THEMES.map((t) => (
            <ThemeCard
              key={t.id}
              meta={t}
              active={theme === t.id}
              previewMode={previewMode}
              onClick={() => setTheme(t.id)}
            />
          ))}
        </div>
      </Group>

      <Group label="Mode">
        <div style={{ display: "flex", gap: 6 }}>
          {MODES.map((m) => (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={clsx("sketch-btn", { primary: m.id === mode })}
              style={{ flex: 1, transform: "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <span style={{ fontFamily: "var(--font-mono)" }}>{m.hint}</span>
              <span>{m.label}</span>
            </button>
          ))}
        </div>
      </Group>

      <Group label="Accent">
        <div style={{ display: "flex", gap: 8 }}>
          {ACCENT_NAMES.map((a) => (
            <button
              key={a}
              onClick={() => setAccent(a)}
              title={a}
              style={{
                width: 22,
                height: 22,
                background: ACCENTS[a],
                border: a === accent ? "2px solid var(--ink)" : "1.5px solid var(--rule)",
                borderRadius: "50%",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>
      </Group>

      <Group label="Workspace">
        <ToggleRow
          label="Pre-fill Claude with workspace context"
          hint="When you open a Claude pane, types &ldquo;Pracuju ve workspace …&rdquo; into the prompt. Press Enter to send."
          value={claudePrefill}
          onChange={setClaudePrefill}
        />
      </Group>

      <Group label="Shortcuts">
        {[
          ["Command palette", "⌘K"],
          ["Claude in new pane", "⌘J"],
          ["New terminal", "⌃ `"],
          ["Split right", "⌘ \\"],
          ["Split down", "⌘ ⇧ \\"],
          ["Close pane", "⌘W"],
          ["Open folder", "⌘O"],
          ["Switch layout", "⌘1 / ⌘2 / ⌘3 / ⌘4"],
        ].map(([k, v]) => (
          <Row key={k} k={k} v={v} />
        ))}
      </Group>

      <Group label="About">
        <div style={{ fontSize: 12, color: "var(--ink-soft)", lineHeight: 1.5 }}>
          Clauna v0.1.0 — minimalist vibe-coding IDE.<br />
          Tauri 2 · React 18 · CodeMirror 6 · xterm.js
        </div>
      </Group>
    </div>
  );
}

interface ThemeCardProps {
  meta: ThemeMeta;
  active: boolean;
  previewMode: "light" | "dark";
  onClick: () => void;
}

function ThemeCard({ meta, active, previewMode, onClick }: ThemeCardProps) {
  const sw = previewMode === "dark" ? meta.swatchDark : meta.swatchLight;
  return (
    <button
      onClick={onClick}
      className="sketch-frame"
      style={{
        padding: 0,
        cursor: "pointer",
        background: sw.bg,
        textAlign: "left",
        overflow: "hidden",
        outline: active ? "2px solid var(--accent)" : "none",
        outlineOffset: -2,
        boxShadow: active ? "var(--frame-shadow)" : "none",
        border: "1.5px solid var(--rule)",
        color: sw.ink,
        transform: "none",
      }}
    >
      <div
        style={{
          padding: "10px 10px 4px",
          fontFamily: meta.fontStack,
          fontSize: 16,
          fontWeight: 700,
          color: sw.ink,
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span>{meta.label}</span>
        <span
          style={{
            display: "inline-block",
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: sw.accent,
          }}
        />
      </div>
      <div
        style={{
          padding: "0 10px 10px",
          fontSize: 11,
          color: previewMode === "dark" ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)",
          fontFamily: meta.fontStack,
          lineHeight: 1.4,
        }}
      >
        {meta.description}
      </div>
    </button>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginTop: 14 }}>
      <div
        className="hand-label"
        style={{ fontSize: 11, opacity: 0.7, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "4px 0" }}>
      <button
        onClick={() => onChange(!value)}
        className="sketch-frame"
        style={{
          width: 36,
          height: 20,
          padding: 0,
          background: value ? "var(--accent)" : "var(--paper-2)",
          position: "relative",
          cursor: "pointer",
          borderRadius: 999,
          flexShrink: 0,
          marginTop: 2,
          transform: "none",
          boxShadow: "none",
          border: "1.5px solid var(--rule)",
        }}
        title={value ? "on" : "off"}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: value ? 18 : 2,
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "var(--paper)",
            border: "1px solid var(--rule)",
            transition: "left .12s",
          }}
        />
      </button>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ color: "var(--ink)" }}>{label}</div>
        {hint && (
          <div style={{ color: "var(--ink-faint)", fontSize: 12, lineHeight: 1.4, marginTop: 2 }}>{hint}</div>
        )}
      </div>
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "6px 0",
        borderBottom: "1px dashed rgb(var(--decor-rgb) / 0.15)",
      }}
    >
      <span style={{ color: "var(--ink-soft)" }}>{k}</span>
      <span className="kbd">{v}</span>
    </div>
  );
}
