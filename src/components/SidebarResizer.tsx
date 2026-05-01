import { useRef } from "react";

const MIN = 200;
const MAX_PX = 560;
const MAX_RATIO = 0.5;

interface Props {
  width: number;
  setWidth: (w: number) => void;
  side?: "left" | "right";
}

export function SidebarResizer({ width, setWidth, side = "left" }: Props) {
  const startX = useRef(0);
  const startW = useRef(0);

  const onMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    startX.current = e.clientX;
    startW.current = width;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    const move = (ev: MouseEvent) => {
      const dx = (ev.clientX - startX.current) * (side === "left" ? 1 : -1);
      const max = Math.min(MAX_PX, window.innerWidth * MAX_RATIO);
      setWidth(Math.min(max, Math.max(MIN, startW.current + dx)));
    };
    const up = () => {
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  return <div className="resizer h" onMouseDown={onMouseDown} title="drag to resize" />;
}
