import { GitCommit, FileDiff, User, Calendar } from "lucide-react";
import type { PullRequest } from "@/lib/data/types";
import { Badge } from "@/components/ui/badge";
import { formatPrDate, reviewStatusBadgeVariant, reviewStatusLabel } from "./pr-utils";

export function LabelBadge({ name, color }: { name: string; color: string }) {
  return (
    <Badge
      size="sm"
      className="ring-border"
      style={{ backgroundColor: `#${color}22`, color: `#${color}` }}
    >
      {name}
    </Badge>
  );
}

export function PullRequestMeta({
  pr,
  showReviewStatus = true,
}: {
  pr: PullRequest;
  showReviewStatus?: boolean;
}) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground">{pr.slug}</p>

      <div className="text-xs">
        <div className="flex flex-col items-start gap-1 sm:hidden">
          <Badge variant="secondary" shape="tag" className="break-all">{pr.sourceBranch}</Badge>
          <span className="text-muted-foreground">↓</span>
          <Badge variant="secondary" shape="tag" className="break-all">{pr.destinationBranch}</Badge>
        </div>
        <div className="hidden items-center gap-2 sm:flex sm:flex-wrap">
          <Badge variant="secondary" shape="tag">{pr.sourceBranch}</Badge>
          <span className="text-muted-foreground">→</span>
          <Badge variant="secondary" shape="tag">{pr.destinationBranch}</Badge>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <User className="h-4 w-4" />
          {pr.author}
        </span>
        <span className="inline-flex items-center gap-1">
          <Calendar className="h-4 w-4" />
          {formatPrDate(pr.createdAt)}
        </span>
        <span className="inline-flex items-center gap-1">
          <GitCommit className="h-4 w-4" />
          {pr.commitCount} commits
        </span>
        <span className="inline-flex items-center gap-1">
          <FileDiff className="h-4 w-4" />
          {pr.filesChanged} files
        </span>
      </div>

      {(showReviewStatus || pr.labels.length > 0) && (
        <div className="flex flex-wrap items-center gap-4">
          {showReviewStatus && (
            <Badge variant={reviewStatusBadgeVariant(pr.reviewStatus)}>
              {reviewStatusLabel(pr.reviewStatus)}
            </Badge>
          )}
          {pr.labels.map((l) => (
            <LabelBadge key={l.name} {...l} />
          ))}
        </div>
      )}

      {pr.reviewers.length > 0 && (
        <div className="flex flex-wrap gap-4">
          {pr.reviewers.map((r) => (
            <Badge key={r.login} variant="secondary" size="sm">
              {r.login} · {reviewStatusLabel(r.state)}
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}

export function isPullRequestActionable(pr: PullRequest) {
  return pr.status === "open" || pr.status === "draft";
}
