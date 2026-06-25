"use client";
import type { DeploymentTimelinePoint } from "@/lib/data";

const COLOR = { success: "var(--status-healthy)", in_progress: "var(--status-warn)", failed: "var(--status-error)" } as const;

export function DeploymentTimelineChart({ data }: { data: DeploymentTimelinePoint[] }) {
  return (
    <div className="flex h-[120px] items-end justify-between gap-2 px-1 pb-4 pt-2">
      {data.map((d) => (
        <div key={d.day} className="flex flex-1 flex-col items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: COLOR[d.status] }} />
          <span className="font-mono text-[10px] text-muted-foreground">{d.day}</span>
        </div>
      ))}
    </div>
  );
}
