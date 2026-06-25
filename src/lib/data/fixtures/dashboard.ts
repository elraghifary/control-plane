import type { DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "../types";

const seed = (slug: string) => (slug.length * 7) % 9;

export function summaryFor(slug: string): DashboardSummary {
  const s = seed(slug);
  return {
    activePullRequests: 8 + s,
    openReleases: 2 + (s % 4),
    lastDeployment: { env: "main", ref: "main", sha: "a1b2c3d", deployedAt: new Date(0).toISOString(), status: "success" },
    repositoryStatus: s % 5 === 0 ? "degraded" : "operational",
    servicesOnline: 6,
    buildHealthPct: 90 + (s % 10),
  };
}

export function envStatusesFor(slug: string): EnvironmentStatus[] {
  const s = seed(slug);
  return [
    { env: "development", status: "healthy", openPRs: 4 + (s % 5), lastDeployAt: new Date(0).toISOString(), marker: "3e9f1a" },
    { env: "staging", status: "deploying", openPRs: 1 + (s % 3), lastDeployAt: new Date(0).toISOString(), marker: "7c2d40", progressPct: 61 },
    { env: "main", status: "stable", openPRs: 0, lastDeployAt: new Date(0).toISOString(), marker: "v2.4.1" },
  ];
}

export function mergeActivityFor(slug: string): MergeActivityPoint[] {
  const s = seed(slug);
  return Array.from({ length: 14 }, (_, i) => ({ date: `D${i + 1}`, merges: Math.max(0, Math.round(3 + Math.sin(i / 2 + s) * 3 + i / 4)) }));
}

export function releaseFrequencyFor(slug: string): ReleaseFrequencyPoint[] {
  const s = seed(slug);
  return Array.from({ length: 7 }, (_, i) => ({ period: `W${i + 1}`, count: Math.max(0, Math.round(2 + Math.cos(i + s) * 2 + i / 3)) }));
}

export function deploymentTimelineFor(slug: string): DeploymentTimelinePoint[] {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const s = seed(slug);
  return days.map((day, i) => ({ day, status: (i + s) % 4 === 0 ? "in_progress" : (i + s) % 7 === 0 ? "failed" : "success" }));
}
