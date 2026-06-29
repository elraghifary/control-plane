import type { DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "../types";

const seed = (slug: string) => (slug.length * 7) % 9;

export function summaryFor(slug: string): DashboardSummary {
  const s = seed(slug);
  return {
    activePullRequests: 8 + s,
    totalReleases: 12 + (s % 4),
    lastDeployment: { env: "main", ref: "v2.4.1", sha: "v2.4.1", deployedAt: "2026-06-20T10:00:00.000Z", status: "success" },
    servicesOnline: 6,
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
  const now = new Date();
  const daysSinceWed = (now.getUTCDay() - 3 + 7) % 7;
  const wedMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysSinceWed);
  return Array.from({ length: 7 }, (_, i) => ({
    date: new Date(wedMs + i * 86400000).toISOString().slice(0, 10),
    merges: Math.max(0, Math.round(3 + Math.sin(i / 2 + s) * 3 + i / 4)),
  }));
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
