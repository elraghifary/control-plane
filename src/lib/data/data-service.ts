import type { Repository, DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint } from "./types";

export interface DataService {
  listRepositories(): Promise<Repository[]>;
  getDashboardSummary(repoSlug: string): Promise<DashboardSummary>;
  getEnvironmentStatuses(repoSlug: string): Promise<EnvironmentStatus[]>;
  getMergeActivity(repoSlug: string): Promise<MergeActivityPoint[]>;
  getReleaseFrequency(repoSlug: string): Promise<ReleaseFrequencyPoint[]>;
  getDeploymentTimeline(repoSlug: string): Promise<DeploymentTimelinePoint[]>;
}
