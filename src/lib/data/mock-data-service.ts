import type { DataService } from "./data-service";
import { REPOSITORIES } from "./fixtures/repositories";
import { summaryFor, envStatusesFor, mergeActivityFor, releaseFrequencyFor, deploymentTimelineFor } from "./fixtures/dashboard";
import { pullRequestsFor } from "./fixtures/pull-requests";
import { releasesFor } from "./fixtures/releases";
import type { StagingSyncResult, StagingCreateResult, StagingPrepareResult, PullRequestListState, PublishReleaseResult, WorkflowRunPage, WorkflowJob } from "./types";

export class MockDataService implements DataService {
  async listRepositories() { return [...REPOSITORIES]; }
  async getDashboardSummary(slug: string) { return summaryFor(slug); }
  async getEnvironmentStatuses(slug: string) { return envStatusesFor(slug); }
  async getMergeActivity(slug: string) { return mergeActivityFor(slug); }
  async getReleaseFrequency(slug: string) { return releaseFrequencyFor(slug); }
  async getDeploymentTimeline(slug: string) { return deploymentTimelineFor(slug); }
  async listPullRequests(targetBranch: string | undefined, repositorySlug: string, state: PullRequestListState = "open") {
    if (!repositorySlug) return [];
    const all = targetBranch
      ? pullRequestsFor(targetBranch)
      : [...pullRequestsFor("development"), ...pullRequestsFor("staging")];
    return all.filter((p) => {
      if (p.slug !== repositorySlug) return false;
      if (state === "open") return p.status === "open" || p.status === "draft";
      return p.status === "closed" || p.status === "merged";
    });
  }
  async countPullRequests(targetBranch: string | undefined, repositorySlug: string, state: PullRequestListState) {
    const list = await this.listPullRequests(targetBranch, repositorySlug, state);
    return list.length;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPullRequestFiles(_slug: string, _number: number) {
    return [
      { filename: "src/app/page.tsx", status: "modified" as const, additions: 12, deletions: 3, patch: "@@ -1,3 +1,12 @@\n-old\n+new line\n context" },
      { filename: "README.md", status: "modified" as const, additions: 2, deletions: 0, patch: "@@ -1,2 +1,4 @@\n+# Feature\n+Added docs" },
    ];
  }
  async getPullRequest(slug: string, number: number) {
    const pr = pullRequestsFor("development").concat(pullRequestsFor("staging")).find((p) => p.slug === slug && p.number === number);
    if (!pr) throw new Error("Pull request not found");
    return pr;
  }
  async submitPullRequestReview() { /* no-op in mock */ }
  async createReviewComment() { /* no-op in mock */ }
  async mergePullRequest() { /* no-op in mock */ }
  async closePullRequest() { /* no-op in mock */ }
  async reopenPullRequest() { /* no-op in mock */ }
  async createAndMergeStagingPR(slug: string): Promise<StagingSyncResult> {
    return { slug, ok: true, prNumber: 99 };
  }
  async createStagingPR(slug: string): Promise<StagingCreateResult> {
    return { slug, created: true, merged: true, prUrl: `https://github.com/${slug}/pull/99` };
  }
  async prepareStagingPR(slug: string): Promise<StagingPrepareResult> {
    return { slug, created: true, prNumber: 99, prUrl: `https://github.com/${slug}/pull/99` };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async prepareBranchPR(slug: string, _base: string): Promise<StagingPrepareResult> {
    return { slug, created: true, prNumber: 99, prUrl: `https://github.com/${slug}/pull/99` };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listBranches(_slug: string) { return ["main", "development", "staging"]; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async createPullRequest(slug: string, _title: string, _head: string, _base: string, _body: string) {
    return { number: 100, htmlUrl: `https://github.com/${slug}/pull/100` };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async compareBranches(_slug: string, _base: string, _head: string) {
    return [
      { filename: "src/app/page.tsx", status: "modified" as const, additions: 12, deletions: 3 },
      { filename: "src/components/new-feature.tsx", status: "added" as const, additions: 45, deletions: 0 },
      { filename: "README.md", status: "modified" as const, additions: 2, deletions: 1 },
    ];
  }
  async listReleases(slug: string) { return releasesFor(slug); }
  async generateReleaseNotes(_slug: string, tagName: string): Promise<string> {
    return `## What's Changed\n* Mock changes for ${tagName} by @elra in #100\n\n**Full Changelog**: https://github.com/example/repo/compare/v0.0.0...${tagName}`;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async publishRelease(slug: string, tagName: string, _targetBranch: string, _body: string): Promise<PublishReleaseResult> {
    return { tagName, htmlUrl: `https://github.com/${slug}/releases/tag/${tagName}` };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listWorkflowRuns(_slug: string, _page: number): Promise<WorkflowRunPage> {
    return { groups: [], totalCount: 0 };
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async listWorkflowJobs(_slug: string, _runId: number): Promise<WorkflowJob[]> {
    return [];
  }
  async rerunWorkflow() { /* no-op in mock */ }
  async rerunFailedJobs() { /* no-op in mock */ }
}
