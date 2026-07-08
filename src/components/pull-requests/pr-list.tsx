"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Check, ChevronLeft, ChevronRight, GitPullRequest } from "lucide-react";
import type { PullRequest, PullRequestListState, Repository } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import { useNavigationLoading } from "@/components/navigation-loading";
import { PrCard } from "./pr-card";
import { SyncStagingDialog } from "./sync-staging-dialog";
import { NewPrDialog } from "./new-pr-dialog";
import { RepositorySelector } from "@/components/shell/repository-selector";

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
  const router = useRouter();
  const { navigate } = useNavigationLoading();
  const [refreshing, startRefresh] = React.useTransition();
  const hasPendingChecks = pullRequests.some((pr) => pr.checksStatus === "pending");

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <RepositorySelector repositories={repositories} selected={selectedSlug} />
        <div className="flex items-center gap-2">
          <NewPrDialog slug={selectedSlug} />
          <SyncStagingDialog repositories={repositories} selectedSlug={selectedSlug} />
        </div>
      </div>

      {hasPendingChecks && (
        <div className="flex items-center justify-between rounded-lg border border-status-warn/30 bg-status-warn/10 px-3 py-2 text-xs text-status-warn">
          <span>Some pull requests have checks still running.</span>
          <Button size="xs" variant="outline" loading={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      )}

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

      {pullRequests.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          No {state} pull requests.
        </p>
      ) : (
        <div className="space-y-4">
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
