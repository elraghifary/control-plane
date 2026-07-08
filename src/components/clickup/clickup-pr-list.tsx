"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PullRequest } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { PrCard } from "@/components/pull-requests/pr-card";
import { useNavigationLoading } from "@/components/navigation-loading";

export interface ClickUpPrEntry {
  pr: PullRequest;
  clickupAuthor: string;
  messageId: string;
}

export function ClickUpPrList({
  items,
  nextCursor,
  hasMore,
  cursorHistory,
  currentCursor,
  currentUserGithubLogin,
}: {
  items: ClickUpPrEntry[];
  nextCursor: string | null;
  hasMore: boolean;
  cursorHistory: string[];
  currentCursor?: string;
  currentUserGithubLogin?: string;
}) {
  const router = useRouter();
  const { navigate } = useNavigationLoading();
  const [refreshing, startRefresh] = React.useTransition();
  const hasPendingChecks = items.some(({ pr }) => pr.checksStatus === "pending");

  function buildUrl(cursor: string | undefined, history: string[]): string {
    const params = new URLSearchParams();
    if (cursor) params.set("cursor", cursor);
    if (history.length) params.set("history", history.join(","));
    const qs = params.toString();
    return `/clickup/pull-requests${qs ? `?${qs}` : ""}`;
  }

  function goNext() {
    if (!nextCursor) return;
    const newHistory = currentCursor ? [...cursorHistory, currentCursor] : cursorHistory;
    navigate(buildUrl(nextCursor, newHistory));
  }

  function goPrev() {
    const prevHistory = [...cursorHistory];
    const prevCursor = prevHistory.pop();
    navigate(buildUrl(prevCursor, prevHistory));
  }

  const isFirstPage = cursorHistory.length === 0 && !currentCursor;
  const showPagination = !isFirstPage || hasMore;

  return (
    <div className="space-y-4">
      {hasPendingChecks && (
        <div className="flex items-center justify-between rounded-lg border border-status-warn/30 bg-status-warn/10 px-3 py-2 text-xs text-status-warn">
          <span>Some pull requests have checks still running.</span>
          <Button size="xs" variant="outline" loading={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      )}
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No GitHub pull request links found in this batch of messages.
        </p>
      ) : (
        <div className="space-y-4">
          {items.map(({ pr, clickupAuthor, messageId }) => {
            const state = pr.status === "closed" || pr.status === "merged" ? "closed" : "open";
            return (
              <PrCard
                key={`${pr.slug}-${pr.number}`}
                pr={pr}
                state={state}
                showRepo
                clickupUser={clickupAuthor}
                clickupMessageId={messageId}
                currentUserGithubLogin={currentUserGithubLogin}
              />
            );
          })}
        </div>
      )}

      {showPagination && (
        <div className="flex items-center justify-between border-t border-border pt-4">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            disabled={isFirstPage}
            onClick={goPrev}
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 rounded-full"
            disabled={!hasMore || !nextCursor}
            onClick={goNext}
          >
            Next
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
