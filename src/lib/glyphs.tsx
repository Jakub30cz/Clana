import { CSSProperties } from "react";

export type GlyphName =
  | "files"
  | "git"
  | "search"
  | "settings"
  | "terminal"
  | "claude"
  | "split-h"
  | "split-v"
  | "plus"
  | "x"
  | "chevron"
  | "chevron-d"
  | "folder"
  | "folder-open"
  | "doc"
  | "sparkle"
  | "branch"
  | "play"
  | "menu"
  | "circle"
  | "square"
  | "dot"
  | "layers";

interface GlyphProps {
  name: GlyphName;
  size?: number;
  color?: string;
  style?: CSSProperties;
}

export function Glyph({ name, size = 14, color = "currentColor", style }: GlyphProps) {
  const s: CSSProperties = { width: size, height: size, ...style };
  const stroke = {
    fill: "none" as const,
    stroke: color,
    strokeWidth: 1.4,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "files":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M2.4 2.6 h6 l1.8 1.8 v9 H2.6 z" />
          <path {...stroke} d="M5 5.5 h4.5 M5 7.8 h4 M5 10.1 h3" />
        </svg>
      );
    case "git":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <circle {...stroke} cx="4.2" cy="3.5" r="1.5" />
          <circle {...stroke} cx="4.2" cy="12.5" r="1.5" />
          <circle {...stroke} cx="11.8" cy="8" r="1.5" />
          <path {...stroke} d="M4.2 5 v6 M5.5 11.8 c2-0.4 4-1.4 5-2.5 M5.6 4.2 c2 0.4 4 1.5 5 2.6" />
        </svg>
      );
    case "search":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <circle {...stroke} cx="6.8" cy="6.8" r="3.5" />
          <path {...stroke} d="M9.5 9.5 l3 3" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <circle {...stroke} cx="8" cy="8" r="2.2" />
          <path
            {...stroke}
            d="M8 1.5 v2 M8 12.5 v2 M1.5 8 h2 M12.5 8 h2 M3.4 3.4 l1.4 1.4 M11.2 11.2 l1.4 1.4 M3.4 12.6 l1.4-1.4 M11.2 4.8 l1.4-1.4"
          />
        </svg>
      );
    case "terminal":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <rect {...stroke} x="1.5" y="2.5" width="13" height="11" rx="1.5" />
          <path {...stroke} d="M3.8 6 l2.2 2 -2.2 2 M7 11.5 h4" />
        </svg>
      );
    case "claude":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M3 4 l2 8 M5.6 5 l1.6 5 M8 4 l2 8 M11 7 l1.5 5" />
          <circle {...stroke} cx="13.5" cy="3.2" r="1" />
        </svg>
      );
    case "split-h":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <rect {...stroke} x="2" y="3" width="12" height="10" rx="1" />
          <path {...stroke} d="M8 3 v10" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case "split-v":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <rect {...stroke} x="2" y="3" width="12" height="10" rx="1" />
          <path {...stroke} d="M2 8 h12" strokeDasharray="1.5 1.5" />
        </svg>
      );
    case "plus":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M8 3 v10 M3 8 h10" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M4 4 l8 8 M12 4 l-8 8" />
        </svg>
      );
    case "chevron":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M5 4 l4 4 -4 4" />
        </svg>
      );
    case "chevron-d":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M4 6 l4 4 4-4" />
        </svg>
      );
    case "folder":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M2 4.5 h4 l1.2 1.4 h6.8 v7 H2 z" />
        </svg>
      );
    case "folder-open":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M2 4.5 h4 l1.2 1.4 h6.8 v1.4" />
          <path {...stroke} d="M2 13 V6.4 H14 L12.4 13 Z" />
        </svg>
      );
    case "doc":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M3.5 2.2 h6 l2 2 v9.6 H3.5 z M9.5 2.2 v2 h2" />
        </svg>
      );
    case "sparkle":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M8 2 l1.4 4.6 4.6 1.4 -4.6 1.4 -1.4 4.6 -1.4 -4.6 -4.6 -1.4 4.6 -1.4 z" />
        </svg>
      );
    case "branch":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <circle {...stroke} cx="4" cy="4" r="1.4" />
          <circle {...stroke} cx="4" cy="12" r="1.4" />
          <circle {...stroke} cx="12" cy="6" r="1.4" />
          <path {...stroke} d="M4 5.4 v5.2 M5 4 c4 0 5 1 5 4 v0.6" />
        </svg>
      );
    case "play":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M5 3 l8 5 -8 5 z" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M2 4 h12 M2 8 h12 M2 12 h12" />
        </svg>
      );
    case "circle":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <circle {...stroke} cx="8" cy="8" r="5.5" />
        </svg>
      );
    case "square":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <rect {...stroke} x="3" y="3" width="10" height="10" rx="1" />
        </svg>
      );
    case "dot":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <circle cx="8" cy="8" r="2" fill={color} />
        </svg>
      );
    case "layers":
      return (
        <svg viewBox="0 0 16 16" style={s}>
          <path {...stroke} d="M8 2 l5 2.5 -5 2.5 -5 -2.5 z M3 8 l5 2.5 5 -2.5 M3 11 l5 2.5 5 -2.5" />
        </svg>
      );
    default:
      return null;
  }
}
