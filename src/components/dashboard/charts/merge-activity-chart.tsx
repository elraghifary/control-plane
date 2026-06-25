"use client";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import type { MergeActivityPoint } from "@/lib/data";

export function MergeActivityChart({ data }: { data: MergeActivityPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="cpMerge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--instrument)" stopOpacity={0.35} />
            <stop offset="100%" stopColor="var(--instrument)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="date" hide />
        <Tooltip cursor={{ stroke: "var(--instrument)", strokeOpacity: 0.3 }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} />
        <Area type="monotone" dataKey="merges" stroke="var(--instrument)" strokeWidth={2} fill="url(#cpMerge)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
