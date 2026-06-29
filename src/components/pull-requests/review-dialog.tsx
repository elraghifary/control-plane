"use client";

import * as React from "react";
import { GitPullRequest } from "lucide-react";
import type { PullRequest } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MarkdownView } from "./markdown-view";
import { PrFilesViewer } from "./pr-files-viewer";
import { submitReviewAndMerge } from "@/app/(app)/pull-requests/actions";

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
import { useNavigationLoading } from "@/components/navigation-loading";

export function ReviewDialog({
  pr,
  open,
  onClose,
}: {
  pr: PullRequest | null;
  open: boolean;
  onClose: () => void;
}) {
  const { runThenRefresh } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) React.startTransition(() => setError(null));
  }, [open, pr?.number]);

  async function approveAndMerge() {
    if (!pr) return;
    await runThenRefresh(async () => {
      setError(null);
      const res = await submitReviewAndMerge(pr.slug, pr.number);
      if (!res.ok) {
        setError(res.error ?? "Merge failed");
        return false;
      }
      onClose();
      return true;
    });
  }

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
            <Badge variant="outline" size="sm" className="shrink-0 font-mono">
              #{pr.number}
            </Badge>
          </DialogTitle>
          {error && <p className="mt-1 text-xs text-status-error">{error}</p>}
        </DialogHeader>

        {/* ── Content: body + 30/70 file list + diff ── */}
        <div className="min-h-0 flex-1 flex flex-col overflow-hidden">
          {pr.body && (
            <div className="shrink-0 border-b border-border px-4 py-3 max-h-32 overflow-y-auto text-sm text-muted-foreground">
              <MarkdownView content={pr.body} />
            </div>
          )}
          <div className="min-h-0 flex-1 overflow-hidden">
            <PrFilesViewer slug={pr.slug} number={pr.number} linkedPrs={linkedPrs} />
          </div>
        </div>

        {/* ── Footer ── */}
        <DialogFooter className="mx-0 mb-0 mt-0 flex-row justify-end gap-3 rounded-none border-t border-border bg-transparent px-4 py-3">
          <Button variant="outline" size="sm" className="rounded-full" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="rounded-full"
            disabled={!pr.mergeable || pr.status === "closed" || pr.status === "merged"}
            onClick={approveAndMerge}
          >
            Approve &amp; merge
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
