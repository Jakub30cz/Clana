import { useCallback, useEffect, useRef } from "react";

interface Props {
  dir: "h" | "v";
  onChange: (ratio: number) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
}

export function Resizer({ dir, onChange, containerRef }: Props) {
  const dragging = useRef(false);

  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!dragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio =
        dir === "h"
          ? (e.clientX - rect.left) / rect.width
          : (e.clientY - rect.top) / rect.height;
      onChange(Math.min(Math.max(ratio, 0.1), 0.9));
    },
    [dir, onChange, containerRef]
  );

  const onMouseUp = useCallback(() => {
    dragging.current = false;
    document.body.style.userSelect = "";
    document.body.style.cursor = "";
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [onMouseMove, onMouseUp]);

  return (
    <div
      className={`resizer ${dir}`}
      onMouseDown={() => {
        dragging.current = true;
        document.body.style.userSelect = "none";
        document.body.style.cursor = dir === "h" ? "col-resize" : "row-resize";
      }}
    />
  );
}
