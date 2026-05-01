import { open } from "@tauri-apps/plugin-dialog";

export async function openFolderDialog(defaultPath?: string): Promise<string | null> {
  try {
    const result = await open({
      directory: true,
      multiple: false,
      title: "Open folder",
      defaultPath,
    });
    if (typeof result === "string") return result;
    if (Array.isArray(result)) return result[0] ?? null;
    return null;
  } catch {
    return null;
  }
}

export function basename(p: string): string {
  if (!p) return "";
  const parts = p.replace(/[\\/]+$/, "").split(/[\\/]/);
  return parts[parts.length - 1] || p;
}
