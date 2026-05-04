/**
 *  Per-path debounced autosave. Lives outside React render cycle to avoid
 *  re-renders on every keystroke. setFileContents() schedules a flush;
 *  markFileSaved()/closeFileInPane()/closeFolder() cancel any pending flush.
 *
 *  Failures keep dirty=true so the next edit (or manual Cmd+S) retries.
 */

import { useStore } from "@/state/store";
import { ipc, safeIpc } from "@/lib/ipc";

const timers = new Map<string, ReturnType<typeof setTimeout>>();

export function scheduleAutosave(path: string): void {
  const { autosave } = useStore.getState();
  if (!autosave.enabled) return;

  const existing = timers.get(path);
  if (existing) clearTimeout(existing);

  const t = setTimeout(() => {
    timers.delete(path);
    void flushAutosave(path);
  }, autosave.debounceMs);
  timers.set(path, t);
}

export function cancelAutosave(path: string): void {
  const t = timers.get(path);
  if (t) {
    clearTimeout(t);
    timers.delete(path);
  }
}

export function cancelAllAutosaves(): void {
  for (const t of timers.values()) clearTimeout(t);
  timers.clear();
}

async function flushAutosave(path: string): Promise<void> {
  const { openFiles, markFileSaved } = useStore.getState();
  const file = openFiles[path];
  if (!file || !file.dirty) return;

  const snapshot = file.contents;
  try {
    await safeIpc(() => ipc.writeText(path, snapshot), undefined);
    const latest = useStore.getState().openFiles[path];
    if (latest && latest.contents === snapshot) {
      markFileSaved(path);
    }
  } catch (err) {
    console.error("autosave failed for", path, err);
  }
}
