import type { PullRequestReviewState, PullRequestStatus } from "@/lib/data/types";

export function formatPrDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

export function reviewStatusLabel(state: PullRequestReviewState) {
  return {
    approved: "Approved",
    changes_requested: "Changes requested",
    pending: "Review required",
    commented: "Commented",
  }[state];
}

export function prStatusLabel(status: PullRequestStatus) {
  return { open: "Open", draft: "Draft", merged: "Merged", closed: "Closed" }[status];
}

export type StatusBadgeVariant = "healthy" | "warn" | "error" | "instrument" | "secondary";

export function reviewStatusBadgeVariant(state: PullRequestReviewState): StatusBadgeVariant {
  if (state === "approved") return "healthy";
  if (state === "changes_requested") return "error";
  if (state === "commented") return "instrument";
  return "warn";
}

export function prStatusBadgeVariant(status: PullRequestStatus): StatusBadgeVariant {
  if (status === "open") return "healthy";
  if (status === "draft") return "secondary";
  if (status === "merged") return "instrument";
  return "secondary";
}

export function fileChangeStatusBadgeVariant(status: string): StatusBadgeVariant {
  if (status === "added") return "healthy";
  if (status === "removed") return "error";
  if (status === "modified") return "instrument";
  return "secondary";
}
