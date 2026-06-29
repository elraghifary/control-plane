"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, GitPullRequest, GitPullRequestClosed, GitMerge, GitCommit, FileDiff, User, Calendar } from "lucide-react";
import type { PullRequest, PullRequestListState, Repository } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ButtonGroup } from "@/components/ui/button-group";
import { useNavigationLoading } from "@/components/navigation-loading";
import {
  formatPrDate,
  prStatusBadgeVariant,
  prStatusLabel,
  reviewStatusBadgeVariant,
  reviewStatusLabel,
} from "./pr-utils";
import { LabelBadge, isPullRequestActionable } from "./pr-meta";
import { ReviewDialog } from "./review-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SyncStagingDialog } from "./sync-staging-dialog";
import { mergePullRequest, closePullRequest, reopenPullRequest } from "@/app/(app)/pull-requests/actions";

function PrCard({ pr, state }: { pr: PullRequest; state: PullRequestListState }) {
  const { runThenRefresh } = useNavigationLoading();
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = React.useState(false);
  const actionable = isPullRequestActionable(pr) && state !== "closed";

  async function merge() {
    await runThenRefresh(async () => {
      const res = await mergePullRequest(pr.slug, pr.number);
      return res.ok;
    });
  }

  async function close() {
    setCloseDialogOpen(false);
    await runThenRefresh(async () => {
      const res = await closePullRequest(pr.slug, pr.number);
      return res.ok;
    });
  }

  async function reopen() {
    setReopenDialogOpen(false);
    await runThenRefresh(async () => {
      const res = await reopenPullRequest(pr.slug, pr.number);
      return res.ok;
    });
  }

  return (
    <>
      <article className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {pr.status === "closed" ? (
                <GitPullRequestClosed className="h-4 w-4 shrink-0 text-status-error" />
              ) : pr.status === "merged" ? (
                <GitMerge className="h-4 w-4 shrink-0 text-instrument-2" />
              ) : (
                <GitPullRequest className="h-4 w-4 shrink-0 text-status-healthy" />
              )}
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium hover:text-instrument hover:underline"
              >
                {pr.title}
              </a>
              <span className="text-xs text-muted-foreground">#{pr.number}</span>
            </div>
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
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{pr.author}</span>
              <span className="inline-flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{formatPrDate(pr.createdAt)}</span>
              <span className="inline-flex items-center gap-1"><GitCommit className="h-3.5 w-3.5" />{pr.commitCount} commits</span>
              <span className="inline-flex items-center gap-1"><FileDiff className="h-3.5 w-3.5" />{pr.filesChanged} files</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={prStatusBadgeVariant(pr.status)}>{prStatusLabel(pr.status)}</Badge>
              {(pr.status === "open" || pr.status === "draft") && (
                <Badge variant={reviewStatusBadgeVariant(pr.reviewStatus)}>
                  {reviewStatusLabel(pr.reviewStatus)}
                  {pr.reviewers.length > 0 && (
                    <>
                      <span className="mx-1 opacity-40">·</span>
                      {pr.reviewers.map((r) => r.login).join(", ")}
                    </>
                  )}
                </Badge>
              )}
              {pr.labels.map((l) => <LabelBadge key={l.name} {...l} />)}
            </div>
          </div>
          <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-stretch">
            {actionable && (
              <>
                <Button variant="outline" size="sm" className="rounded-full hover:border-status-healthy/40 hover:text-status-healthy" onClick={() => setReviewOpen(true)}>
                  Review
                </Button>
                <Button size="sm" variant="outline" className="rounded-full hover:border-instrument/40 hover:text-instrument" disabled={!pr.mergeable} onClick={merge}>
                  Merge
                </Button>
              </>
            )}
            {state === "open" && (
              <Button size="sm" variant="outline" className="rounded-full hover:border-status-error/40 hover:text-status-error" onClick={() => setCloseDialogOpen(true)}>
                Close
              </Button>
            )}
            {state === "closed" && pr.status === "closed" && (
              <Button size="sm" variant="outline" className="rounded-full hover:border-status-healthy/40 hover:text-status-healthy" onClick={() => setReopenDialogOpen(true)}>
                Reopen
              </Button>
            )}
            <a
              href={pr.htmlUrl}
              target="_blank"
              rel="noreferrer"
            >
              <Button size="sm" variant="outline" className="rounded-full w-full">
                View
              </Button>
            </a>
          </div>
        </div>
      </article>
      <ReviewDialog pr={pr} open={reviewOpen} onClose={() => setReviewOpen(false)} />
      <Dialog open={closeDialogOpen} onOpenChange={setCloseDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Close pull request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Close <span className="font-medium text-foreground">#{pr.number} {pr.title}</span>? This can be reopened later.
          </p>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="rounded-full border-status-error/40 bg-status-error/10 text-status-error hover:bg-status-error/20" onClick={close}>
              Close pull request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={reopenDialogOpen} onOpenChange={setReopenDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reopen pull request</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Reopen <span className="font-medium text-foreground">#{pr.number} {pr.title}</span>?
          </p>
          <div className="flex justify-end gap-2 px-5 py-4 border-t border-border">
            <Button variant="outline" size="sm" className="rounded-full" onClick={() => setReopenDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="rounded-full border-status-healthy/40 bg-status-healthy/10 text-status-healthy hover:bg-status-healthy/20" onClick={reopen}>
              Reopen pull request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PrList({
  pullRequests,
  state,
  openCount,
  closedCount,
  page,
  totalPages,
  repositories,
  selectedSlug,
}: {
  pullRequests: PullRequest[];
  state: PullRequestListState;
  openCount: number;
  closedCount: number;
  page: number;
  totalPages: number;
  repositories: Repository[];
  selectedSlug: string;
}) {
  const pathname = usePathname();
  const { navigate } = useNavigationLoading();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
      <ButtonGroup>
        <Button
          size="sm"
          variant={state === "open" ? "default" : "outline"}
          className="gap-2"
          onClick={() => navigate(`${pathname}?state=open`)}
        >
          <GitPullRequest className="h-4 w-4" />
          {openCount} Open
        </Button>
        <Button
          size="sm"
          variant={state === "closed" ? "default" : "outline"}
          className="gap-2"
          onClick={() => navigate(`${pathname}?state=closed`)}
        >
          <Check className="h-4 w-4" />
          {closedCount} Closed
        </Button>
      </ButtonGroup>
      <SyncStagingDialog repositories={repositories} selectedSlug={selectedSlug} />
      </div>

      {pullRequests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No {state} pull requests.
        </p>
      ) : (
        <div className="space-y-3">
          {pullRequests.map((pr) => (
            <PrCard key={`${pr.slug}-${pr.number}`} pr={pr} state={state} />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            disabled={page <= 1}
            onClick={() => navigate(`${pathname}?state=${state}&page=${page - 1}`)}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            disabled={page >= totalPages}
            onClick={() => navigate(`${pathname}?state=${state}&page=${page + 1}`)}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
