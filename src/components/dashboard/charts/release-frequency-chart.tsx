"use client";
import { Bar, BarChart, ResponsiveContainer, XAxis } from "recharts";
import type { ReleaseFrequencyPoint } from "@/lib/data";

export function ReleaseFrequencyChart({ data }: { data: ReleaseFrequencyPoint[] }) {
  return (
    <ResponsiveContainer width="100%" height={120}>
      <BarChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: 0 }}>
        <XAxis dataKey="period" hide />
        <Bar dataKey="count" fill="var(--instrument-2)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
