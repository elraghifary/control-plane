"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { PullRequest } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { PrCard } from "@/components/pull-requests/pr-card";
import { useNavigationLoading } from "@/components/navigation-loading";

export function ClickUpPrList({
  pullRequests,
  nextCursor,
  hasMore,
  cursorHistory,
  currentCursor,
}: {
  pullRequests: PullRequest[];
  nextCursor: string | null;
  hasMore: boolean;
  cursorHistory: string[];
  currentCursor?: string;
}) {
  const { navigate } = useNavigationLoading();

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
      {pullRequests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No GitHub pull request links found in this batch of messages.
        </p>
      ) : (
        <div className="space-y-4">
          {pullRequests.map((pr) => {
            const state = pr.status === "closed" || pr.status === "merged" ? "closed" : "open";
            return <PrCard key={`${pr.slug}-${pr.number}`} pr={pr} state={state} showRepo />;
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
