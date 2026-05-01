/**
 *  Manual mousedown→mousemove→mouseup drag manager.
 *
 *  We don't use HTML5 drag-and-drop because Tauri 2 on macOS WKWebView
 *  intercepts/swallows internal drag events in a way that breaks drop
 *  targets inside the page (CodeMirror, xterm, etc.). Manual mouse
 *  tracking sidesteps the entire HTML5 drag system, so it works in
 *  every webview regardless of platform quirks.
 */

import { useEffect, useState } from "react";
import { useStore } from "@/state/store";
import { ipc, safeIpc } from "@/lib/ipc";
import type { PaneNode } from "@/lib/paneTree";
import type { DropZone } from "@/lib/paneTree";

export type DragPayload =
  | { type: "file"; path: string; name: string }
  | { type: "pane"; paneId: string };

export interface DragState {
  active: boolean;
  payload: DragPayload | null;
  x: number;
  y: number;
  /** id of the pane (`data-pane-id`) currently under the cursor. */
  hoverPaneId: string | null;
  /** zone within hoverPane — only meaningful for pane drags. */
  hoverZone: DropZone | null;
}

const state: DragState = {
  active: false,
  payload: null,
  x: 0,
  y: 0,
  hoverPaneId: null,
  hoverZone: null,
};

const listeners = new Set<() => void>();
function notify() {
  for (const l of listeners) l();
}

/** Subscribe to drag-state changes. Components re-render whenever the active
 *  payload, position, or hover target shifts. */
export function useDragState(): DragState {
  const [snap, setSnap] = useState<DragState>({ ...state });
  useEffect(() => {
    const onChange = () => setSnap({ ...state });
    listeners.add(onChange);
    return () => {
      listeners.delete(onChange);
    };
  }, []);
  return snap;
}

const DRAG_THRESHOLD_PX = 5;

function findLeafKind(node: PaneNode, id: string): "editor" | "shell" | "claude" | null {
  if (node.type === "leaf") return node.id === id ? node.kind : null;
  return findLeafKind(node.a, id) ?? findLeafKind(node.b, id);
}

function computeHover(x: number, y: number, payload: DragPayload | null) {
  const targetEl = document.elementFromPoint(x, y);
  const paneEl = (targetEl?.closest?.("[data-pane-id]") ?? null) as HTMLElement | null;
  if (!paneEl) return { paneId: null as string | null, zone: null as DropZone | null };
  const paneId = paneEl.getAttribute("data-pane-id");
  let zone: DropZone | null = null;
  if (payload?.type === "pane") {
    const rect = paneEl.getBoundingClientRect();
    const relX = (x - rect.left) / rect.width;
    const relY = (y - rect.top) / rect.height;
    if (relY < 0.2) zone = "top";
    else if (relY > 0.8) zone = "bottom";
    else if (relX < 0.2) zone = "left";
    else if (relX > 0.8) zone = "right";
    else zone = "center";
  }
  return { paneId, zone };
}

/** Begin tracking a potential drag. Pass the originating mouse event plus
 *  the payload to drag and an optional click handler — if the user releases
 *  without moving past the threshold, the click handler fires instead.
 *
 *  Use on `onMouseDown` of any draggable element. Returns immediately;
 *  movement and release are tracked via window listeners. */
export function beginDrag(
  e: React.MouseEvent | MouseEvent,
  payload: DragPayload,
  onClick?: () => void,
): void {
  // Left-click only.
  if ((e as MouseEvent).button !== 0) {
    onClick?.();
    return;
  }
  const startX = e.clientX;
  const startY = e.clientY;
  let started = false;

  const begin = () => {
    started = true;
    state.active = true;
    state.payload = payload;
    document.body.style.cursor = payload.type === "pane" ? "grabbing" : "copy";
    notify();
  };

  const onMove = (ev: MouseEvent) => {
    state.x = ev.clientX;
    state.y = ev.clientY;
    if (!started) {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD_PX) return;
      begin();
    }
    const hover = computeHover(ev.clientX, ev.clientY, payload);
    state.hoverPaneId = hover.paneId;
    state.hoverZone = hover.zone;
    notify();
  };

  const reset = () => {
    state.active = false;
    state.payload = null;
    state.hoverPaneId = null;
    state.hoverZone = null;
    document.body.style.cursor = "";
    notify();
  };

  const onUp = (ev: MouseEvent) => {
    window.removeEventListener("mousemove", onMove, true);
    window.removeEventListener("mouseup", onUp, true);
    window.removeEventListener("keydown", onKey, true);

    if (!started) {
      // No movement — treat as click.
      reset();
      onClick?.();
      return;
    }
    const hover = computeHover(ev.clientX, ev.clientY, payload);
    reset();
    void handleDrop(payload, hover.paneId, hover.zone);
  };

  // Esc cancels the drag.
  const onKey = (ev: KeyboardEvent) => {
    if (ev.key === "Escape") {
      window.removeEventListener("mousemove", onMove, true);
      window.removeEventListener("mouseup", onUp, true);
      window.removeEventListener("keydown", onKey, true);
      reset();
    }
  };

  window.addEventListener("mousemove", onMove, true);
  window.addEventListener("mouseup", onUp, true);
  window.addEventListener("keydown", onKey, true);
}

async function handleDrop(
  payload: DragPayload,
  paneId: string | null,
  zone: DropZone | null,
): Promise<void> {
  const s = useStore.getState();

  if (payload.type === "file") {
    const text = await safeIpc(() => ipc.readText(payload.path), "");
    if (!paneId) {
      // Dropped outside any pane → smart open routes to existing editor or
      // creates a new one beside the active pane.
      s.openFile(payload.path, payload.name, text);
      return;
    }
    const kind = findLeafKind(s.tree, paneId);
    if (kind === "editor") {
      s.openFileInPane(paneId, payload.path, payload.name, text);
      s.setActivePane(paneId);
    } else if (kind === "shell" || kind === "claude") {
      const newId = s.splitPane(paneId, "h", "editor", {
        filePath: payload.path,
        name: payload.name,
      });
      s.openFileInPane(newId, payload.path, payload.name, text);
    } else {
      s.openFile(payload.path, payload.name, text);
    }
    return;
  }

  if (payload.type === "pane") {
    if (!paneId || !zone) return;
    if (paneId === payload.paneId) return;
    s.movePane(payload.paneId, paneId, zone);
  }
}
