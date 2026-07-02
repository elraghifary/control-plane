import type { PullRequest } from "../types";

const BASE: Omit<PullRequest, "number" | "slug" | "title" | "sourceBranch" | "destinationBranch"> = {
  id: 0,
  author: "elra",
  authorAvatarUrl: undefined,
  createdAt: "2026-06-24T08:00:00.000Z",
  status: "open",
  mergeable: true,
  reviewers: [{ login: "reviewer1", state: "pending" }],
  labels: [{ name: "enhancement", color: "a2eeef" }],
  commitCount: 4,
  filesChanged: 12,
  reviewStatus: "pending",
  body: "Implements the new dashboard widgets.",
  htmlUrl: "#",
  checksStatus: "success",
  failingChecks: [],
  headSha: "abc1234",
};

export function pullRequestsFor(targetBranch: string): PullRequest[] {
  if (targetBranch === "development") {
    return [
      { ...BASE, id: 101, number: 42, slug: "happykids-id/dashboard", title: "feat: add mission control metrics", sourceBranch: "feature/metrics", destinationBranch: "development", reviewStatus: "approved", reviewers: [{ login: "alice", state: "approved" }], labels: [{ name: "feature", color: "0e8a16" }] },
      { ...BASE, id: 102, number: 18, slug: "happykids-id/payment", title: "fix: webhook retry logic", sourceBranch: "fix/webhook-retry", destinationBranch: "development", reviewStatus: "changes_requested", reviewers: [{ login: "bob", state: "changes_requested" }], commitCount: 2, filesChanged: 5, checksStatus: "failure", failingChecks: ["lint", "test"] },
      { ...BASE, id: 103, number: 9, slug: "happykids-id/dashboard", title: "chore: cleanup deps", sourceBranch: "chore/deps", destinationBranch: "development", status: "merged", mergeable: false, reviewStatus: "approved", reviewers: [] },
    ];
  }
  return [
    { ...BASE, id: 201, number: 7, slug: "happykids-id/dashboard", title: "Sync Development to Staging", sourceBranch: "development", destinationBranch: "staging", reviewStatus: "approved", reviewers: [] },
  ];
}
