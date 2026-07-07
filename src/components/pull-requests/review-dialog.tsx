"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { GitPullRequest } from "lucide-react";
import type { PullRequest } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MarkdownView } from "./markdown-view";
import { PrFilesViewer } from "./pr-files-viewer";
import { submitReview, submitReviewAndMerge } from "@/app/(app)/pull-requests/actions";
import { sendClickUpReplyAction } from "@/app/(app)/clickup/pull-requests/actions";
import { mergeBlockedReason } from "./pr-utils";

function parseLinkedPrs(body: string): Array<{ slug: string; number: number }> {
  const re = /https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/(\d+)/g;
  const seen = new Set<string>();
  const result: Array<{ slug: string; number: number }> = [];
  let m;
  while ((m = re.exec(body)) !== null) {
    const key = `${m[1]}#${m[2]}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push({ slug: m[1], number: parseInt(m[2], 10) });
    }
  }
  return result;
}

export function ReviewDialog({
  pr,
  open,
  onClose,
  clickupMessageId,
  currentUserGithubLogin,
}: {
  pr: PullRequest | null;
  open: boolean;
  onClose: () => void;
  clickupMessageId?: string;
  currentUserGithubLogin?: string;
}) {
  const router = useRouter();
  const [error, setError] = React.useState<string | null>(null);
  const [commentOpen, setCommentOpen] = React.useState(false);
  const [commentText, setCommentText] = React.useState("");
  const [commentPreview, setCommentPreview] = React.useState(false);
  const [commentSubmitting, setCommentSubmitting] = React.useState(false);
  const [merging, setMerging] = React.useState(false);

  React.useEffect(() => {
    if (open) React.startTransition(() => { setError(null); setCommentOpen(false); });
  }, [open, pr?.number]);

  async function approveAndMerge() {
    if (!pr) return;
    setError(null);
    setMerging(true);
    const res = await submitReviewAndMerge(pr.slug, pr.number);
    if (!res.ok) {
      setMerging(false);
      setError(res.error ?? "Merge failed");
      return;
    }
    // GitHub's API can briefly lag before a just-merged PR's status is
    // reflected on read — wait a moment before refetching the list.
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setMerging(false);
    onClose();
    router.refresh();
  }

  function openComment() {
    setCommentText("");
    setCommentPreview(false);
    setCommentOpen(true);
  }

  async function submitComment() {
    if (!pr || !commentText.trim()) return;
    setCommentSubmitting(true);
    const res = await submitReview(pr.slug, pr.number, "COMMENT", commentText);
    if (!res.ok) {
      setCommentSubmitting(false);
      toast.error(res.error ?? "Could not submit comment");
      return;
    }
    if (clickupMessageId) {
      const clickupContent = `💬 Comment by ${currentUserGithubLogin ?? "unknown"}:\n${commentText}`;
      const clickupRes = await sendClickUpReplyAction(clickupMessageId, clickupContent);
      if (!clickupRes.ok) {
        toast.error(`Commented on GitHub, but ClickUp reply failed: ${clickupRes.error ?? "unknown error"}`);
      }
    }
    setCommentSubmitting(false);
    setCommentOpen(false);
    toast.success("Comment submitted");
    router.refresh();
  }

  const blockReason = pr ? mergeBlockedReason(pr) : undefined;

  const linkedPrs = React.useMemo(
    () => parseLinkedPrs(pr?.body ?? "").filter((p) => p.slug !== pr?.slug),
    [pr?.body, pr?.slug],
  );

  if (!pr) return null;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent
        className="flex h-[min(90vh,860px)] max-w-[min(96vw,1200px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1200px)]"
        showCloseButton
      >
        {/* ── Header: full-width title + body ── */}
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4">
          <DialogTitle className="flex min-w-0 flex-wrap items-center gap-2 pr-10">
            <GitPullRequest className="h-4 w-4 shrink-0 text-instrument" />
            <span className="min-w-0 font-medium text-foreground">{pr.title}</span>
            <Badge variant="outline" size="sm" className="shrink-0">
              #{pr.number}
            </Badge>
          </DialogTitle>
          {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
        </DialogHeader>

        {/* ── Content: comment composer, or body + 30/70 file list + diff ──
             Both stay mounted (toggled via `hidden`) so PrFilesViewer doesn't
             re-fetch every time the comment composer is opened/closed. */}
        <div className={cn("min-h-0 flex-1 overflow-y-auto px-4 py-4", !commentOpen && "hidden")}>
          <div className="mb-3 flex items-center justify-between">
            <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Comment</label>
            <div className="flex rounded-lg border border-border text-xs">
              <button
                onClick={() => setCommentPreview(false)}
                className={cn("px-2.5 py-1 transition-colors", !commentPreview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                Write
              </button>
              <button
                onClick={() => setCommentPreview(true)}
                className={cn("border-l border-border px-2.5 py-1 transition-colors", commentPreview ? "bg-muted text-foreground" : "text-muted-foreground hover:text-foreground")}
              >
                Preview
              </button>
            </div>
          </div>
          {commentPreview ? (
            <div className="min-h-[200px] rounded-lg border border-border bg-card/40 px-3 py-2 text-sm">
              {commentText.trim() ? <MarkdownView content={commentText} /> : (
                <p className="text-muted-foreground">Nothing to preview.</p>
              )}
            </div>
          ) : (
            <Textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Leave a comment…"
              rows={10}
              className="bg-card/40"
            />
          )}
        </div>
        <div className={cn("min-h-0 flex-1 flex flex-col overflow-hidden", commentOpen && "hidden")}>
          {pr.body && (
            <div className="shrink-0 border-b border-border px-4 py-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
              <MarkdownView content={pr.body} />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <PrFilesViewer slug={pr.slug} number={pr.number} linkedPrs={linkedPrs} commitId={pr.headSha} />
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="mx-0 mb-0 mt-0 flex-row justify-end gap-3 rounded-none border-t border-border bg-transparent px-4 py-3">
          {commentOpen ? (
            <>
              <Button variant="outline" size="sm" className="" onClick={() => setCommentOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="" loading={commentSubmitting} disabled={!commentText.trim()} onClick={submitComment}>
                {commentSubmitting ? "Submitting…" : "Comment"}
              </Button>
            </>
          ) : pr.status === "closed" || pr.status === "merged" ? (
            <Button size="sm" className="" onClick={onClose}>
              Close
            </Button>
          ) : (
            <>
              {blockReason && <p className="mr-auto self-center text-xs text-status-error">{blockReason}</p>}
              <Button variant="outline" size="sm" className="" disabled={merging} onClick={onClose}>
                Cancel
              </Button>
              <Button variant="outline" size="sm" className="" disabled={merging} onClick={openComment}>
                Comment
              </Button>
              <Button
                size="sm"
                className=""
                disabled={!!blockReason}
                loading={merging}
                title={blockReason}
                onClick={approveAndMerge}
              >
                {merging ? "Approving and merging…" : "Approve & Merge"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
