export type EnvName = "development" | "staging" | "main";

export interface Repository { id: string; name: string; slug: string; enabled: boolean; defaultBranch: string; }
export interface Deployment { env: EnvName; ref: string; sha: string; deployedAt: string; status: "success" | "in_progress" | "failed"; }
export interface DashboardSummary {
  activePullRequests: number;
  openReleases: number;
  lastDeployment: Deployment;
  repositoryStatus: "operational" | "degraded" | "down";
  servicesOnline: number;
  buildHealthPct: number;
}
export interface EnvironmentStatus {
  env: EnvName;
  status: "healthy" | "deploying" | "stable" | "degraded";
  openPRs: number;
  lastDeployAt: string;
  marker: string;
  progressPct?: number;
}
export interface MergeActivityPoint { date: string; merges: number; }
export interface ReleaseFrequencyPoint { period: string; count: number; }
export interface DeploymentTimelinePoint { day: string; status: "success" | "in_progress" | "failed"; }
