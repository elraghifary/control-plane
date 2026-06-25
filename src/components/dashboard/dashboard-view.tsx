"use client";
import { GitPullRequest, Tag, Rocket, Radar, Activity } from "lucide-react";
import type { DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "@/lib/data";
import { MetricCard } from "./metric-card";
import { StatusWidget } from "./status-widget";
import { MergeActivityChart } from "./charts/merge-activity-chart";
import { ReleaseFrequencyChart } from "./charts/release-frequency-chart";
import { DeploymentTimelineChart } from "./charts/deployment-timeline-chart";
import { FadeInUp } from "@/components/motion/fade-in";

export function DashboardView({ summary, envs, merge, release, timeline }: {
  summary: DashboardSummary; envs: EnvironmentStatus[];
  merge: MergeActivityPoint[]; release: ReleaseFrequencyPoint[]; timeline: DeploymentTimelinePoint[];
}) {
  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-lg font-medium">Mission Control</h1>
        <p className="text-xs text-muted-foreground">Deployment overview · all systems nominal</p>
      </div>

      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-3 lg:grid-cols-5">
        <MetricCard label="Active PRs" value={summary.activePullRequests} delta="▲ this week" deltaTone="healthy" icon={GitPullRequest} />
        <MetricCard label="Open Releases" value={summary.openReleases} delta="awaiting publish" deltaTone="warn" icon={Tag} />
        <MetricCard label="Last Deploy" icon={Rocket} footer={<div className="mt-2 font-mono text-sm">{summary.lastDeployment.sha}</div>} />
        <MetricCard label="Repo Status" icon={Radar} footer={<div className="mt-2 text-sm font-medium text-status-healthy capitalize">{summary.repositoryStatus}</div>} />
        <MetricCard label="Build Health" value={summary.buildHealthPct} suffix="%" delta="last 14 days" deltaTone="muted" icon={Activity} />
      </div>

      <FadeInUp className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
        <div className="mb-1 text-sm font-medium">Merge Activity</div>
        <MergeActivityChart data={merge} />
      </FadeInUp>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
          <div className="mb-1 text-sm font-medium">Deployment Timeline</div>
          <DeploymentTimelineChart data={timeline} />
        </div>
        <div className="rounded-xl border border-border/60 bg-card/40 p-3 backdrop-blur-xl">
          <div className="mb-1 text-sm font-medium">Release Frequency</div>
          <ReleaseFrequencyChart data={release} />
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {envs.map((e) => <StatusWidget key={e.env} status={e} />)}
      </div>
    </div>
  );
}
