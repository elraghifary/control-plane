export type EnvName = "development" | "staging" | "main";

export interface Repository { id: string; name: string; slug: string; enabled: boolean; defaultBranch: string; }
export interface Deployment { env: EnvName; ref: string; sha: string; deployedAt: string; status: "success" | "in_progress" | "failed"; }
export interface DashboardSummary {
  activePullRequests: number;
  totalReleases: number;
  lastDeployment: Deployment;
  servicesOnline: number;
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

export type PullRequestReviewState = "approved" | "changes_requested" | "pending" | "commented";
export type PullRequestStatus = "open" | "draft" | "merged" | "closed";

export interface PullRequestReviewer {
  login: string;
  avatarUrl?: string;
  state: PullRequestReviewState;
}

export interface PullRequestLabel {
  name: string;
  color: string;
}

export type PullRequestChecksStatus = "pending" | "success" | "failure" | "none";

export interface PullRequest {
  id: number;
  number: number;
  slug: string;
  title: string;
  author: string;
  authorAvatarUrl?: string;
  sourceBranch: string;
  destinationBranch: string;
  createdAt: string;
  status: PullRequestStatus;
  mergeable: boolean;
  reviewers: PullRequestReviewer[];
  labels: PullRequestLabel[];
  commitCount: number;
  filesChanged: number;
  reviewStatus: PullRequestReviewState;
  body: string;
  htmlUrl: string;
  checksStatus: PullRequestChecksStatus;
  failingChecks: string[];
}

export interface StagingSyncResult {
  slug: string;
  ok: boolean;
  error?: string;
  prNumber?: number;
}

export interface StagingCreateResult {
  slug: string;
  created: boolean;
  merged: boolean;
  alreadySynced?: boolean;
  prUrl?: string;
  error?: string;
}

export interface StagingPrepareResult {
  slug: string;
  alreadySynced?: boolean;
  created?: boolean;
  prNumber?: number;
  prUrl?: string;
  error?: string;
}

export interface Release {
  id: number;
  slug: string;
  tagName: string;
  name: string;
  body: string;
  isLatest: boolean;
  isDraft: boolean;
  isPrerelease: boolean;
  targetBranch: string;
  publishedAt: string | null;
  createdAt: string;
  htmlUrl: string;
  author: string;
}

export interface PublishReleaseResult {
  tagName: string;
  htmlUrl: string;
}

export type PullRequestListState = "open" | "closed";

export interface PullRequestFileChange {
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  patch?: string;
  previousFilename?: string;
}
