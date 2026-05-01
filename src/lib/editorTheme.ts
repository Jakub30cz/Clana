import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
import { Extension } from "@codemirror/state";
import { tags as t } from "@lezer/highlight";
import { ThemeName } from "@/state/store";

export type SyntaxPalette = "auto" | "warm" | "cool" | "pop" | "subtle";

export interface SyntaxPaletteMeta {
  id: SyntaxPalette;
  label: string;
  description: string;
  swatch: [string, string, string, string];
}

export const SYNTAX_PALETTES: SyntaxPaletteMeta[] = [
  { id: "auto",   label: "Auto",   description: "Match the active app theme.", swatch: ["#cf222e", "#0a3069", "#8250df", "#6e7781"] },
  { id: "warm",   label: "Warm",   description: "Earth tones, ember accents.", swatch: ["#c2410c", "#65a30d", "#9333ea", "#a89a78"] },
  { id: "cool",   label: "Cool",   description: "Ocean blues and teals.",      swatch: ["#1d4ed8", "#0f766e", "#6d28d9", "#94a3b8"] },
  { id: "pop",    label: "Pop",    description: "Vivid, high contrast.",       swatch: ["#c026d3", "#2563eb", "#06b6d4", "#db2777"] },
  { id: "subtle", label: "Subtle", description: "Monochrome — weight & italic.", swatch: ["#1f1d1a", "#4a463f", "#8a857a", "#1f1d1a"] },
];

interface Colors {
  keyword: string;
  control: string;
  string: string;
  number: string;
  comment: string;
  type: string;
  function: string;
  funcCall: string;
  variable: string;
  property: string;
  operator: string;
  bracket: string;
  tag: string;
  attribute: string;
  meta: string;
  bool: string;
  regexp: string;
  heading: string;
  link: string;
}

// Per-app-theme "auto" palettes — tuned to feel native to each look.
const AUTO: Record<ThemeName, { light: Colors; dark: Colors }> = {
  sketch: {
    light: { keyword: "#b94d2a", control: "#c0633e", string: "#5e7a3c", number: "#a86e0e", comment: "#9b8e75", type: "#7c5638", function: "#6f4880", funcCall: "#7a4a8a", variable: "#3d352b", property: "#2f6a72", operator: "#7a6f5d", bracket: "#5a544a", tag: "#a44a2a", attribute: "#7c5638", meta: "#9b8e75", bool: "#a86e0e", regexp: "#5e7a3c", heading: "#9c4a23", link: "#2f6a72" },
    dark:  { keyword: "#f4a679", control: "#f7b58a", string: "#bcd07a", number: "#e8c275", comment: "#7c7464", type: "#d4a884", function: "#d2a8e0", funcCall: "#dcb4e6", variable: "#e8e0cc", property: "#7ed1d6", operator: "#a89c84", bracket: "#9a907e", tag: "#f4a679", attribute: "#d4a884", meta: "#7c7464", bool: "#e8c275", regexp: "#bcd07a", heading: "#f7b58a", link: "#7ed1d6" },
  },
  clean: {
    light: { keyword: "#cf222e", control: "#cf222e", string: "#0a3069", number: "#0550ae", comment: "#6e7781", type: "#953800", function: "#8250df", funcCall: "#6639ba", variable: "#24292f", property: "#0550ae", operator: "#5b6066", bracket: "#5b6066", tag: "#116329", attribute: "#953800", meta: "#6e7781", bool: "#0550ae", regexp: "#0a3069", heading: "#0550ae", link: "#0a3069" },
    dark:  { keyword: "#ff7b72", control: "#ff7b72", string: "#a5d6ff", number: "#79c0ff", comment: "#8b949e", type: "#ffa657", function: "#d2a8ff", funcCall: "#bc8cff", variable: "#e6edf3", property: "#79c0ff", operator: "#a8b1bd", bracket: "#a8b1bd", tag: "#7ee787", attribute: "#ffa657", meta: "#8b949e", bool: "#79c0ff", regexp: "#a5d6ff", heading: "#79c0ff", link: "#a5d6ff" },
  },
  mono: {
    light: { keyword: "#000000", control: "#000000", string: "#404040", number: "#000000", comment: "#909090", type: "#000000", function: "#000000", funcCall: "#000000", variable: "#000000", property: "#404040", operator: "#404040", bracket: "#404040", tag: "#000000", attribute: "#404040", meta: "#909090", bool: "#000000", regexp: "#404040", heading: "#000000", link: "#0066ff" },
    dark:  { keyword: "#ffffff", control: "#ffffff", string: "#c8c8c8", number: "#ffffff", comment: "#6a6a6a", type: "#ffffff", function: "#ffffff", funcCall: "#ffffff", variable: "#ffffff", property: "#c8c8c8", operator: "#c8c8c8", bracket: "#c8c8c8", tag: "#ffffff", attribute: "#c8c8c8", meta: "#6a6a6a", bool: "#ffffff", regexp: "#c8c8c8", heading: "#ffffff", link: "#66a3ff" },
  },
  serif: {
    light: { keyword: "#8b3a1a", control: "#9c4623", string: "#4a6a3a", number: "#b45309", comment: "#9b8d72", type: "#1e6f70", function: "#6b4796", funcCall: "#7a52a3", variable: "#3d342a", property: "#1e6f70", operator: "#7c6f5e", bracket: "#5b5249", tag: "#8b3a1a", attribute: "#1e6f70", meta: "#9b8d72", bool: "#b45309", regexp: "#4a6a3a", heading: "#722e16", link: "#1e6f70" },
    dark:  { keyword: "#e8a878", control: "#f0b787", string: "#a8c074", number: "#e8b878", comment: "#807660", type: "#7ec4c5", function: "#c8a8e0", funcCall: "#d4b4e8", variable: "#e8dec8", property: "#7ec4c5", operator: "#a89e84", bracket: "#928876", tag: "#e8a878", attribute: "#7ec4c5", meta: "#807660", bool: "#e8b878", regexp: "#a8c074", heading: "#f0b787", link: "#7ec4c5" },
  },
};

// Theme-independent palettes.
const FIXED: Record<Exclude<SyntaxPalette, "auto">, { light: Colors; dark: Colors }> = {
  warm: {
    light: { keyword: "#c2410c", control: "#d04a18", string: "#65a30d", number: "#a16207", comment: "#a89a78", type: "#b45309", function: "#9333ea", funcCall: "#a855f7", variable: "#3d3528", property: "#0891b2", operator: "#7c6f5e", bracket: "#5b5249", tag: "#c2410c", attribute: "#b45309", meta: "#a89a78", bool: "#a16207", regexp: "#65a30d", heading: "#9a3412", link: "#0891b2" },
    dark:  { keyword: "#fb923c", control: "#fdba74", string: "#a3e635", number: "#fbbf24", comment: "#a8a29e", type: "#facc15", function: "#c084fc", funcCall: "#d8b4fe", variable: "#fef3c7", property: "#67e8f9", operator: "#a8a08e", bracket: "#928876", tag: "#fb923c", attribute: "#facc15", meta: "#a8a29e", bool: "#fbbf24", regexp: "#a3e635", heading: "#fdba74", link: "#67e8f9" },
  },
  cool: {
    light: { keyword: "#1d4ed8", control: "#2563eb", string: "#0f766e", number: "#0284c7", comment: "#94a3b8", type: "#6d28d9", function: "#0891b2", funcCall: "#0e7490", variable: "#1e293b", property: "#0d9488", operator: "#64748b", bracket: "#64748b", tag: "#1d4ed8", attribute: "#6d28d9", meta: "#94a3b8", bool: "#0284c7", regexp: "#0f766e", heading: "#1e40af", link: "#0891b2" },
    dark:  { keyword: "#60a5fa", control: "#93c5fd", string: "#5eead4", number: "#38bdf8", comment: "#94a3b8", type: "#c4b5fd", function: "#67e8f9", funcCall: "#22d3ee", variable: "#e2e8f0", property: "#2dd4bf", operator: "#94a3b8", bracket: "#94a3b8", tag: "#60a5fa", attribute: "#c4b5fd", meta: "#94a3b8", bool: "#38bdf8", regexp: "#5eead4", heading: "#93c5fd", link: "#67e8f9" },
  },
  pop: {
    light: { keyword: "#c026d3", control: "#d946ef", string: "#2563eb", number: "#db2777", comment: "#94a3b8", type: "#06b6d4", function: "#7c3aed", funcCall: "#8b5cf6", variable: "#1e293b", property: "#06b6d4", operator: "#64748b", bracket: "#64748b", tag: "#c026d3", attribute: "#06b6d4", meta: "#94a3b8", bool: "#db2777", regexp: "#2563eb", heading: "#a21caf", link: "#06b6d4" },
    dark:  { keyword: "#f472b6", control: "#f9a8d4", string: "#93c5fd", number: "#fda4af", comment: "#94a3b8", type: "#67e8f9", function: "#c4b5fd", funcCall: "#a78bfa", variable: "#e2e8f0", property: "#67e8f9", operator: "#94a3b8", bracket: "#94a3b8", tag: "#f472b6", attribute: "#67e8f9", meta: "#94a3b8", bool: "#fda4af", regexp: "#93c5fd", heading: "#f9a8d4", link: "#67e8f9" },
  },
  // Subtle leans on CSS vars + style (bold/italic) instead of colour. Light & dark resolve identically via vars.
  subtle: {
    light: { keyword: "var(--ink)", control: "var(--ink)", string: "var(--ink-soft)", number: "var(--ink)", comment: "var(--ink-faint)", type: "var(--ink)", function: "var(--ink)", funcCall: "var(--ink)", variable: "var(--ink)", property: "var(--ink-soft)", operator: "var(--ink-faint)", bracket: "var(--ink-faint)", tag: "var(--ink)", attribute: "var(--ink-soft)", meta: "var(--ink-faint)", bool: "var(--ink)", regexp: "var(--ink-soft)", heading: "var(--ink)", link: "var(--accent)" },
    dark:  { keyword: "var(--ink)", control: "var(--ink)", string: "var(--ink-soft)", number: "var(--ink)", comment: "var(--ink-faint)", type: "var(--ink)", function: "var(--ink)", funcCall: "var(--ink)", variable: "var(--ink)", property: "var(--ink-soft)", operator: "var(--ink-faint)", bracket: "var(--ink-faint)", tag: "var(--ink)", attribute: "var(--ink-soft)", meta: "var(--ink-faint)", bool: "var(--ink)", regexp: "var(--ink-soft)", heading: "var(--ink)", link: "var(--accent)" },
  },
};

function resolveColors(palette: SyntaxPalette, theme: ThemeName, mode: "light" | "dark"): Colors {
  if (palette === "auto") return AUTO[theme][mode];
  return FIXED[palette][mode];
}

function buildHighlight(c: Colors, opts: { subtle: boolean }): HighlightStyle {
  const bold = opts.subtle ? "600" : undefined;
  const rules: Parameters<typeof HighlightStyle.define>[0] = [
    { tag: [t.comment, t.lineComment, t.blockComment, t.docComment], color: c.comment, fontStyle: "italic" },
    { tag: t.meta, color: c.meta },
    { tag: t.annotation, color: c.meta },
    { tag: t.processingInstruction, color: c.meta },

    { tag: [t.keyword, t.modifier, t.definitionKeyword, t.operatorKeyword, t.self], color: c.keyword, fontWeight: bold },
    { tag: t.controlKeyword, color: c.control, fontWeight: bold },
    { tag: [t.null, t.bool, t.atom], color: c.bool },

    { tag: [t.number, t.integer, t.float, t.unit], color: c.number },

    { tag: [t.string, t.docString, t.character, t.attributeValue], color: c.string },
    { tag: [t.regexp, t.special(t.string), t.escape], color: c.regexp },

    { tag: t.variableName, color: c.variable },
    { tag: t.definition(t.variableName), color: c.variable },
    { tag: t.local(t.variableName), color: c.variable },
    { tag: t.function(t.variableName), color: c.funcCall },
    { tag: t.definition(t.function(t.variableName)), color: c.function, fontWeight: bold },

    { tag: t.propertyName, color: c.property },
    { tag: t.function(t.propertyName), color: c.funcCall },

    { tag: [t.typeName, t.className, t.namespace], color: c.type },
    { tag: t.labelName, color: c.variable },
    { tag: t.macroName, color: c.function },

    { tag: t.tagName, color: c.tag, fontWeight: bold },
    { tag: t.attributeName, color: c.attribute },
    { tag: [t.angleBracket, t.bracket, t.brace, t.paren, t.squareBracket], color: c.bracket },

    { tag: [t.punctuation, t.separator, t.derefOperator], color: c.operator },
    { tag: [t.operator, t.compareOperator, t.logicOperator, t.arithmeticOperator, t.bitwiseOperator, t.updateOperator, t.definitionOperator, t.typeOperator, t.controlOperator], color: c.operator },

    { tag: t.heading, color: c.heading, fontWeight: "700" },
    { tag: t.heading1, color: c.heading, fontWeight: "700" },
    { tag: t.heading2, color: c.heading, fontWeight: "700" },
    { tag: t.heading3, color: c.heading, fontWeight: "700" },
    { tag: [t.heading4, t.heading5, t.heading6], color: c.heading, fontWeight: "600" },
    { tag: t.emphasis, fontStyle: "italic" },
    { tag: t.strong, fontWeight: "700" },
    { tag: t.strikethrough, textDecoration: "line-through" },
    { tag: [t.link, t.url], color: c.link, textDecoration: "underline" },
    { tag: t.quote, color: c.string, fontStyle: "italic" },
    { tag: t.monospace, color: c.string },
    { tag: t.contentSeparator, color: c.bracket },

    { tag: t.invalid, color: "#ff5252" },
    { tag: t.inserted, color: "#22c55e" },
    { tag: t.deleted, color: "#ef4444" },
    { tag: t.changed, color: "#eab308" },
  ];
  return HighlightStyle.define(rules);
}

function buildUITheme(isDark: boolean): Extension {
  const selectionBg = isDark ? "rgba(125, 180, 255, 0.22)" : "rgba(70, 120, 200, 0.18)";
  const matchBg = isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(0, 0, 0, 0.06)";
  return EditorView.theme(
    {
      "&": {
        backgroundColor: "var(--paper)",
        color: "var(--ink)",
        fontFamily: "var(--font-mono)",
        fontSize: "13px",
        height: "100%",
      },
      ".cm-scroller": {
        fontFamily: "var(--font-mono)",
        lineHeight: "1.55",
      },
      ".cm-content": {
        caretColor: "var(--accent)",
        fontFamily: "var(--font-mono)",
        padding: "8px 0",
      },
      ".cm-cursor, .cm-dropCursor": { borderLeftColor: "var(--accent)", borderLeftWidth: "2px" },
      "&.cm-focused .cm-cursor": { borderLeftColor: "var(--accent)" },
      "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": {
        backgroundColor: selectionBg,
      },
      ".cm-gutters": {
        backgroundColor: "var(--paper)",
        color: "var(--ink-faint)",
        borderRight: "1px dashed rgb(var(--decor-rgb) / 0.15)",
        fontFamily: "var(--font-mono)",
      },
      ".cm-lineNumbers .cm-gutterElement": { padding: "0 10px 0 8px", minWidth: "28px" },
      ".cm-activeLine": { backgroundColor: isDark ? "rgba(255,255,255,0.025)" : "rgba(0,0,0,0.025)" },
      ".cm-activeLineGutter": {
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)",
        color: "var(--ink)",
      },
      ".cm-matchingBracket": {
        backgroundColor: matchBg,
        outline: "1px solid var(--accent)",
        borderRadius: "2px",
      },
      ".cm-nonmatchingBracket": {
        backgroundColor: "rgba(255, 80, 80, 0.18)",
      },
      ".cm-foldPlaceholder": {
        color: "var(--ink-faint)",
        backgroundColor: "transparent",
        border: "1px dashed rgb(var(--decor-rgb) / 0.3)",
        padding: "0 4px",
        borderRadius: "3px",
      },
      ".cm-tooltip": {
        backgroundColor: "var(--paper-2)",
        color: "var(--ink)",
        border: "1px solid var(--rule)",
        borderRadius: "4px",
      },
      ".cm-panels": {
        backgroundColor: "var(--paper-2)",
        color: "var(--ink)",
        borderTop: "1px solid var(--rule)",
      },
      ".cm-searchMatch": {
        backgroundColor: "rgba(255, 200, 0, 0.25)",
        outline: "1px solid rgba(255, 180, 0, 0.6)",
      },
      ".cm-searchMatch.cm-searchMatch-selected": {
        backgroundColor: "rgba(255, 180, 0, 0.5)",
      },
      ".cm-selectionMatch": {
        backgroundColor: matchBg,
      },
    },
    { dark: isDark }
  );
}

export function buildEditorTheme(palette: SyntaxPalette, theme: ThemeName, mode: "light" | "dark"): Extension[] {
  const colors = resolveColors(palette, theme, mode);
  return [buildUITheme(mode === "dark"), syntaxHighlighting(buildHighlight(colors, { subtle: palette === "subtle" }))];
}
