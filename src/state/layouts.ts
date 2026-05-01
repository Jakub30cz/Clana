import { PaneNode, makeLeaf } from "@/lib/paneTree";

export type LayoutMode = "classic" | "zen" | "tiled" | "claude-dock";

export const LAYOUT_LABELS: Record<LayoutMode, string> = {
  classic: "① Classic L-shape",
  zen: "② Zen palette-first",
  tiled: "③ Tiled grid",
  "claude-dock": "④ Claude dock",
};

export function initialTreeFor(mode: LayoutMode): PaneNode {
  switch (mode) {
    case "classic":
      return {
        type: "split",
        dir: "v",
        ratio: 0.65,
        a: makeLeaf("editor", { name: "untitled" }),
        b: {
          type: "split",
          dir: "h",
          ratio: 0.5,
          a: makeLeaf("shell", { name: "zsh" }),
          b: makeLeaf("claude", { name: "claude" }),
        },
      };
    case "zen":
      return makeLeaf("editor", { name: "untitled" });
    case "tiled":
      return {
        type: "split",
        dir: "h",
        ratio: 0.5,
        a: {
          type: "split",
          dir: "v",
          ratio: 0.5,
          a: makeLeaf("editor", { name: "Editor.tsx" }),
          b: makeLeaf("shell", { name: "zsh" }),
        },
        b: {
          type: "split",
          dir: "v",
          ratio: 0.5,
          a: makeLeaf("editor", { name: "app.tsx" }),
          b: makeLeaf("claude", { name: "claude" }),
        },
      };
    case "claude-dock":
      return {
        type: "split",
        dir: "v",
        ratio: 0.65,
        a: makeLeaf("editor", { name: "untitled" }),
        b: makeLeaf("shell", { name: "zsh" }),
      };
  }
}
