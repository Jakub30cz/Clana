import { useEffect, useState } from "react";
import { useStore } from "@/state/store";

export function useResolvedColorMode(): "light" | "dark" {
  const mode = useStore((s) => s.mode);
  const [systemDark, setSystemDark] = useState(() =>
    typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
  );

  useEffect(() => {
    if (mode !== "auto") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [mode]);

  if (mode === "auto") return systemDark ? "dark" : "light";
  return mode;
}
