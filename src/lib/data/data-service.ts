import type { Repository, DashboardSummary, EnvironmentStatus, MergeActivityPoint, ReleaseFrequencyPoint, DeploymentTimelinePoint, PullRequest, StagingSyncResult, StagingCreateResult, StagingPrepareResult, PullRequestListState, PullRequestFileChange, Release, PublishReleaseResult } from "./types";

export type PullRequestReviewEvent = "APPROVE" | "REQUEST_CHANGES" | "COMMENT";

export interface DataService {
  listRepositories(): Promise<Repository[]>;
  getDashboardSummary(repositorySlug: string): Promise<DashboardSummary>;
  getEnvironmentStatuses(repositorySlug: string): Promise<EnvironmentStatus[]>;
  getMergeActivity(repositorySlug: string): Promise<MergeActivityPoint[]>;
  getReleaseFrequency(repositorySlug: string): Promise<ReleaseFrequencyPoint[]>;
  getDeploymentTimeline(repositorySlug: string): Promise<DeploymentTimelinePoint[]>;
  listPullRequests(targetBranch: string | undefined, repositorySlug: string, state?: PullRequestListState): Promise<PullRequest[]>;
  countPullRequests(targetBranch: string | undefined, repositorySlug: string, state: PullRequestListState): Promise<number>;
  getPullRequest(slug: string, number: number): Promise<PullRequest>;
  getPullRequestFiles(slug: string, number: number): Promise<PullRequestFileChange[]>;
  submitPullRequestReview(slug: string, number: number, event: PullRequestReviewEvent, body?: string): Promise<void>;
  mergePullRequest(slug: string, number: number): Promise<void>;
  closePullRequest(slug: string, number: number): Promise<void>;
  reopenPullRequest(slug: string, number: number): Promise<void>;
  createAndMergeStagingPR(slug: string): Promise<StagingSyncResult>;
  createStagingPR(slug: string): Promise<StagingCreateResult>;
  prepareStagingPR(slug: string): Promise<StagingPrepareResult>;
  listBranches(slug: string): Promise<string[]>;
  createPullRequest(slug: string, title: string, head: string, base: string, body: string): Promise<{ number: number; htmlUrl: string }>;
  compareBranches(slug: string, base: string, head: string): Promise<PullRequestFileChange[]>;
  listReleases(slug: string): Promise<Release[]>;
  generateReleaseNotes(slug: string, tagName: string, targetBranch: string, previousTag?: string): Promise<string>;
  publishRelease(slug: string, tagName: string, targetBranch: string, body: string): Promise<PublishReleaseResult>;
}
