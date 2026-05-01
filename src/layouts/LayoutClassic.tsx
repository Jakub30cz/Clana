import { Sidebar } from "@/components/Sidebar";
import { PaneShell } from "@/components/panes/PaneShell";
import { useStore } from "@/state/store";

export function LayoutClassic() {
  const tree = useStore((s) => s.tree);
  return (
    <div style={{ flex: 1, minHeight: 0, display: "flex", position: "relative" }}>
      <Sidebar />
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", position: "relative" }}>
        <div style={{ flex: 1, minHeight: 0, display: "flex" }}>
          <PaneShell pane={tree} />
        </div>
      </div>
    </div>
  );
}
