"use client";

import * as React from "react";
import { User, Clock, ChevronRight } from "lucide-react";
import type { WorkflowRunGroup } from "@/lib/data/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { runStatusLabel, runStatusBadgeVariant, aggregateRunStatus, formatRelativeTime } from "./actions-utils";
import { RunStatusIcon, statusIconColor } from "./run-status-icon";
import { WorkflowRunCard } from "./workflow-run-card";

export function WorkflowRunGroupCard({ slug, group }: { slug: string; group: WorkflowRunGroup }) {
  const [expanded, setExpanded] = React.useState(false);
  const aggregate = aggregateRunStatus(group.runs);
  const contextLabel = group.refNumber ? `PR #${group.refNumber}` : group.displayTitle;

  return (
    <article className="rounded-xl border border-border/70 bg-card/50 backdrop-blur transition-colors hover:border-instrument/30">
      <button type="button" onClick={() => setExpanded((v) => !v)} className="flex w-full items-start gap-3 p-4 text-left">
        <RunStatusIcon
          status={aggregate.status}
          conclusion={aggregate.conclusion}
          className={cn("mt-0.5 h-4 w-4 shrink-0", statusIconColor(aggregate.status, aggregate.conclusion))}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          {group.refUrl ? (
            <a
              href={group.refUrl}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="inline-block max-w-full truncate text-sm font-medium hover:text-instrument hover:underline"
            >
              {group.displayTitle}{group.refNumber && ` #${group.refNumber}`}
            </a>
          ) : (
            <p className="truncate text-sm font-medium">{group.displayTitle}</p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" size="sm">{group.branch}</Badge>
            <Badge variant={runStatusBadgeVariant(aggregate.status, aggregate.conclusion)} size="sm">
              {runStatusLabel(aggregate.status, aggregate.conclusion)}
            </Badge>
            <Badge variant="secondary" size="sm">{group.runs.length} workflow{group.runs.length === 1 ? "" : "s"}</Badge>
          </div>
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{group.actor}</span>
            <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{formatRelativeTime(group.createdAt)}</span>
          </div>
        </div>
        <ChevronRight className={cn("mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="space-y-2 border-t border-border/70 py-3 pl-11 pr-4">
          {group.runs.map((run) => (
            <WorkflowRunCard key={run.id} slug={slug} run={run} contextLabel={contextLabel} />
          ))}
        </div>
      )}
    </article>
  );
}
