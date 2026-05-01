import { useMemo } from "react";
import type { CommitGraph as CG, CommitInfo, RefInfo } from "@/lib/ipc";

const ROW_H = 22;
const LANE_W = 14;
const DOT_R = 3.5;
const HEAD_DOT_R = 5;

const LANE_COLORS = [
  "var(--accent)",
  "var(--accent-2)",
  "oklch(0.65 0.16 145)",
  "oklch(0.65 0.18 290)",
  "oklch(0.65 0.16 20)",
  "oklch(0.62 0.13 60)",
];

function laneColor(lane: number): string {
  return LANE_COLORS[lane % LANE_COLORS.length];
}

interface Props {
  data: CG;
  currentBranch?: string;
}

interface LaneAssignment {
  laneOf: Map<string, number>;
  totalLanes: number;
}

/** First-parent-stays-in-lane layout. Reuses freed lanes. */
function layoutGraph(commits: CommitInfo[]): LaneAssignment {
  const laneOf = new Map<string, number>();
  const expected = new Map<number, string>();
  const free: number[] = [];
  let nextLane = 0;
  let maxSeen = 0;

  const takeLane = (): number => {
    if (free.length > 0) return free.shift()!;
    return nextLane++;
  };

  const findLaneExpecting = (oid: string): number => {
    for (const [lane, want] of expected) {
      if (want === oid) return lane;
    }
    return -1;
  };

  for (const c of commits) {
    let myLane = findLaneExpecting(c.oid);
    if (myLane === -1) myLane = takeLane();
    expected.delete(myLane);
    laneOf.set(c.oid, myLane);
    if (myLane > maxSeen) maxSeen = myLane;

    if (c.parents.length === 0) {
      free.push(myLane);
    } else {
      const p0 = c.parents[0];
      const existing = findLaneExpecting(p0);
      if (existing >= 0) {
        // first parent already lives elsewhere — release my lane
        free.push(myLane);
      } else {
        expected.set(myLane, p0);
      }
      for (let i = 1; i < c.parents.length; i++) {
        const p = c.parents[i];
        if (findLaneExpecting(p) >= 0) continue;
        const lane = takeLane();
        expected.set(lane, p);
        if (lane > maxSeen) maxSeen = lane;
      }
    }
  }

  return { laneOf, totalLanes: maxSeen + 1 };
}

export function CommitGraph({ data, currentBranch }: Props) {
  const { commits, refs_by_oid: refsByOid, head } = data;
  const { laneOf, totalLanes } = useMemo(() => layoutGraph(commits), [commits]);
  const rowOf = useMemo(() => {
    const m = new Map<string, number>();
    commits.forEach((c, i) => m.set(c.oid, i));
    return m;
  }, [commits]);

  const graphW = Math.max(1, totalLanes) * LANE_W + 4;
  const graphH = commits.length * ROW_H;

  if (commits.length === 0) {
    return (
      <div style={{ padding: 12, fontSize: 12, color: "var(--ink-faint)" }}>
        No commits yet.
      </div>
    );
  }

  return (
    <div
      style={{
        position: "relative",
        flex: 1,
        minHeight: 0,
        overflow: "auto",
      }}
    >
      <svg
        width={graphW}
        height={graphH}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          pointerEvents: "none",
        }}
      >
        {/* edges to parents */}
        {commits.map((c, i) =>
          c.parents.map((p, pi) => {
            const pRow = rowOf.get(p);
            if (pRow === undefined) return null;
            const cLane = laneOf.get(c.oid)!;
            const pLane = laneOf.get(p)!;
            const x1 = cLane * LANE_W + LANE_W / 2;
            const y1 = i * ROW_H + ROW_H / 2;
            const x2 = pLane * LANE_W + LANE_W / 2;
            const y2 = pRow * ROW_H + ROW_H / 2;
            const stroke = laneColor(pi === 0 ? cLane : pLane);
            const key = `${c.oid}-${pi}`;
            if (x1 === x2) {
              return (
                <line
                  key={key}
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke={stroke}
                  strokeWidth={1.6}
                />
              );
            }
            const midY = y1 + ROW_H / 2;
            const d = `M ${x1} ${y1} L ${x1} ${midY - 4} Q ${x1} ${midY}, ${
              x1 + (x2 > x1 ? 6 : -6)
            } ${midY} L ${x2 - (x2 > x1 ? 6 : -6)} ${midY} Q ${x2} ${midY}, ${x2} ${
              midY + 4
            } L ${x2} ${y2}`;
            return (
              <path
                key={key}
                d={d}
                stroke={stroke}
                strokeWidth={1.6}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            );
          })
        )}
        {/* dots */}
        {commits.map((c, i) => {
          const lane = laneOf.get(c.oid)!;
          const x = lane * LANE_W + LANE_W / 2;
          const y = i * ROW_H + ROW_H / 2;
          const isHead = c.oid === head;
          return (
            <circle
              key={c.oid}
              cx={x}
              cy={y}
              r={isHead ? HEAD_DOT_R : DOT_R}
              fill={laneColor(lane)}
              stroke="var(--paper)"
              strokeWidth={isHead ? 2 : 1.5}
            />
          );
        })}
      </svg>

      <div style={{ position: "relative" }}>
        {commits.map((c) => {
          const refs = refsByOid[c.oid] ?? [];
          const isHead = c.oid === head;
          return (
            <div
              key={c.oid}
              style={{
                height: ROW_H,
                display: "flex",
                alignItems: "center",
                paddingLeft: graphW + 6,
                paddingRight: 8,
                gap: 6,
                fontSize: 12,
                whiteSpace: "nowrap",
                overflow: "hidden",
              }}
              title={`${c.short} · ${c.author} · ${new Date(c.time * 1000).toLocaleString()}\n${c.message}`}
            >
              <span
                style={{
                  color: "var(--ink-faint)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 10,
                  flexShrink: 0,
                }}
              >
                {c.short}
              </span>
              {refs.map((r) => (
                <RefChip key={r.name} r={r} head={isHead && r.name === currentBranch} />
              ))}
              <span
                style={{
                  flex: 1,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  color: "var(--ink)",
                  fontFamily: "var(--font-hand)",
                  fontSize: 13,
                  fontWeight: isHead ? 700 : 400,
                }}
              >
                {c.message || "(no message)"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function RefChip({ r, head }: { r: RefInfo; head?: boolean }) {
  const palette =
    r.kind === "local"
      ? { bg: "var(--accent-soft)", color: "var(--ink)", border: "var(--accent)" }
      : r.kind === "remote"
      ? { bg: "var(--paper-2)", color: "var(--ink-soft)", border: "var(--rule)" }
      : { bg: "var(--paper-2)", color: "var(--ink-faint)", border: "var(--rule)" };
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: 10,
        background: palette.bg,
        color: palette.color,
        border: `1px solid ${palette.border}`,
        padding: "0 4px",
        borderRadius: 3,
        flexShrink: 0,
        fontWeight: head ? 700 : 400,
      }}
    >
      {r.name}
    </span>
  );
}
