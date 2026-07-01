"use client";

import * as React from "react";
import { toast } from "sonner";
import { GitPullRequest, GitPullRequestClosed, GitMerge, GitCommit, FileDiff, User, Calendar } from "lucide-react";
import type { PullRequest, PullRequestListState } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useNavigationLoading } from "@/components/navigation-loading";
import { formatPrDate, prStatusBadgeVariant, prStatusLabel, reviewStatusBadgeVariant, reviewStatusLabel, checksStatusBadgeVariant, checksStatusLabel, mergeBlockedReason } from "./pr-utils";
import { LabelBadge, isPullRequestActionable } from "./pr-meta";
import { ReviewDialog } from "./review-dialog";
import { mergePullRequest, closePullRequest, reopenPullRequest } from "@/app/(app)/pull-requests/actions";
import { notifyBlockedPrAction } from "@/app/(app)/clickup/pull-requests/actions";

export function PrCard({ pr, state, showRepo, clickupUser, clickupMessageId }: { pr: PullRequest; state: PullRequestListState; showRepo?: boolean; clickupUser?: string; clickupMessageId?: string }) {
  const { runThenRefresh } = useNavigationLoading();
  const [reviewOpen, setReviewOpen] = React.useState(false);
  const [closeDialogOpen, setCloseDialogOpen] = React.useState(false);
  const [reopenDialogOpen, setReopenDialogOpen] = React.useState(false);
  const [notifying, setNotifying] = React.useState(false);
  const actionable = isPullRequestActionable(pr) && state !== "closed";
  const blockReason = mergeBlockedReason(pr);

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

  async function notify() {
    if (!clickupMessageId || !blockReason) return;
    setNotifying(true);
    const content = blockReason;
    const res = await notifyBlockedPrAction(clickupMessageId, content);
    setNotifying(false);
    if (!res.ok) {
      toast.error(res.error ?? "Could not send notification");
      return;
    }
    toast.success("Notified in ClickUp");
  }

  return (
    <>
      <article className="rounded-xl border border-border/70 bg-card/50 p-4 backdrop-blur transition-colors hover:border-instrument/30">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0 flex-1 space-y-2.5">
            {showRepo && (
              <div className="space-y-1">
                {clickupUser && (
                  <div>
                    <Badge variant="instrument" size="sm">{clickupUser}</Badge>
                  </div>
                )}
                <div>
                  <Badge variant="secondary" size="sm">{pr.slug}</Badge>
                </div>
              </div>
            )}
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
                <Badge variant="secondary" className="break-all">{pr.sourceBranch}</Badge>
                <span className="text-muted-foreground">↓</span>
                <Badge variant="secondary" className="break-all">{pr.destinationBranch}</Badge>
              </div>
              <div className="hidden items-center gap-2 sm:flex sm:flex-wrap">
                <Badge variant="secondary">{pr.sourceBranch}</Badge>
                <span className="text-muted-foreground">→</span>
                <Badge variant="secondary">{pr.destinationBranch}</Badge>
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
              {pr.checksStatus !== "none" && (
                <Badge variant={checksStatusBadgeVariant(pr.checksStatus)}>{checksStatusLabel(pr.checksStatus)}</Badge>
              )}
              {pr.labels.map((l) => <LabelBadge key={l.name} {...l} />)}
            </div>
            {actionable && blockReason && (
              <p className="text-xs text-status-error">{blockReason}</p>
            )}
          </div>
          <div className="flex shrink-0 flex-row items-center gap-2 sm:flex-col sm:items-stretch">
            <Button variant="outline" size="sm" className="hover:border-status-healthy/40 hover:text-status-healthy" onClick={() => setReviewOpen(true)}>
              {state === "closed" ? "Reviewed" : "Review"}
            </Button>
            {actionable && (
              <Button
                size="sm"
                variant="outline"
                className="hover:border-instrument/40 hover:text-instrument"
                disabled={!!blockReason}
                title={blockReason}
                onClick={merge}
              >
                Merge
              </Button>
            )}
            {showRepo && clickupMessageId && actionable && (
              <Button
                size="sm"
                variant="outline"
                className="hover:border-status-warn/40 hover:text-status-warn"
                disabled={!blockReason || notifying}
                title={blockReason ? undefined : "No blocking issues to notify about"}
                onClick={notify}
              >
                {notifying ? "Notifying…" : "Notify"}
              </Button>
            )}
            {state === "open" && (
              <Button size="sm" variant="outline" className="hover:border-status-error/40 hover:text-status-error" onClick={() => setCloseDialogOpen(true)}>
                Close
              </Button>
            )}
            {state === "closed" && pr.status === "closed" && (
              <Button size="sm" variant="outline" className="hover:border-status-healthy/40 hover:text-status-healthy" onClick={() => setReopenDialogOpen(true)}>
                Reopen
              </Button>
            )}
            <a href={pr.htmlUrl} target="_blank" rel="noreferrer">
              <Button size="sm" variant="outline" className="w-full">
                GitHub
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
            <Button variant="outline" size="sm" className="" onClick={() => setCloseDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="border-status-error/40 bg-status-error/10 text-status-error hover:bg-status-error/20" onClick={close}>
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
            <Button variant="outline" size="sm" className="" onClick={() => setReopenDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="border-status-healthy/40 bg-status-healthy/10 text-status-healthy hover:bg-status-healthy/20" onClick={reopen}>
              Reopen pull request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
