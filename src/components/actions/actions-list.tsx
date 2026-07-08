"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { WorkflowRunGroup } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { WorkflowRunGroupCard } from "./workflow-run-group-card";
import { aggregateRunStatus } from "./actions-utils";

export function ActionsList({ slug, groups }: { slug: string; groups: WorkflowRunGroup[] }) {
  const router = useRouter();
  const [refreshing, startRefresh] = React.useTransition();

  const hasInProgress = groups.some((g) => {
    const aggregate = aggregateRunStatus(g.runs);
    return aggregate.status === "in_progress" || aggregate.status === "queued";
  });

  return (
    <div className="space-y-3">
      {hasInProgress && (
        <div className="flex items-center justify-between rounded-lg border border-status-warn/30 bg-status-warn/10 px-3 py-2 text-xs text-status-warn">
          <span>Some workflows are still running.</span>
          <Button size="xs" variant="outline" loading={refreshing} onClick={() => startRefresh(() => router.refresh())}>
            {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      )}
      {groups.map((group) => (
        <WorkflowRunGroupCard key={group.key} slug={slug} group={group} />
      ))}
    </div>
  );
}
