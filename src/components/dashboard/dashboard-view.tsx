"use client";
import { GitPullRequest, Tag, Rocket } from "lucide-react";
import type { Repository, DashboardSummary, EnvironmentStatus, MergeActivityPoint } from "@/lib/data";
import { MetricCard } from "./metric-card";
import { StatusWidget } from "./status-widget";
import { MergeActivityChart } from "./charts/merge-activity-chart";
import { FadeInUp } from "@/components/motion/fade-in";
import { RepositorySelector } from "@/components/shell/repository-selector";

function formatReleaseDate(iso: string) {
  const d = new Date(iso);
  if (d.getTime() === 0) return "—";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
}

export function DashboardView({ summary, envs, merge, repositories, selectedSlug }: {
  summary: DashboardSummary; envs: EnvironmentStatus[]; merge: MergeActivityPoint[];
  repositories: Repository[]; selectedSlug: string;
}) {
  return (
    <div>
      <RepositorySelector repositories={repositories} selected={selectedSlug} />

      <div className="mt-5 space-y-4">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <MetricCard label="Active PRs" value={summary.activePullRequests} icon={GitPullRequest} />
        <MetricCard label="Total Releases" value={summary.totalReleases} icon={Tag} />
        <MetricCard
          label="Latest Release"
          icon={Rocket}
          footer={
            <div className="mt-2 space-y-0.5">
              <div className="font-mono text-sm">{summary.lastDeployment.ref}</div>
              <div className="text-[11px] text-muted-foreground">{formatReleaseDate(summary.lastDeployment.deployedAt)}</div>
            </div>
          }
        />
      </div>

      <FadeInUp className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
        <div className="mb-1 text-sm font-medium">Merge Activity</div>
        <MergeActivityChart data={merge} />
      </FadeInUp>

      <div className="grid gap-3 md:grid-cols-3">
        {envs.map((e) => <StatusWidget key={e.env} status={e} />)}
      </div>
      </div>
    </div>
  );
}
