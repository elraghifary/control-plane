"use client";

import * as React from "react";
import type { WorkflowJob, WorkflowJobStep } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { formatDuration } from "./actions-utils";
import { RunStatusIcon, statusIconColor } from "./run-status-icon";
import { fetchWorkflowJobs } from "@/app/(app)/actions/actions";

const POLL_INTERVAL_MS = 4000;

function stepDuration(step: WorkflowJobStep): string | null {
  if (!step.startedAt || !step.completedAt) return null;
  const seconds = Math.max(0, Math.round((new Date(step.completedAt).getTime() - new Date(step.startedAt).getTime()) / 1000));
  return formatDuration(seconds);
}

function JobStepsDialogContent({ slug, runId, job }: { slug: string; runId: number; job: WorkflowJob }) {
  const [liveJob, setLiveJob] = React.useState(job);

  React.useEffect(() => {
    if (liveJob.status !== "in_progress") return;
    const jobId = liveJob.id;
    const interval = setInterval(async () => {
      const jobs = await fetchWorkflowJobs(slug, runId);
      const updated = jobs.find((j) => j.id === jobId);
      if (updated) setLiveJob(updated);
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [liveJob, slug, runId]);

  return (
    <DialogContent className="flex max-h-[80vh] max-w-md flex-col gap-0 p-0" showCloseButton>
      <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
        <DialogTitle className="text-base">{liveJob.name}</DialogTitle>
      </DialogHeader>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
        {liveJob.steps.length === 0 ? (
          <p className="text-sm text-muted-foreground">No steps reported for this job.</p>
        ) : (
          <div className="space-y-2">
            {liveJob.steps.map((step) => (
              <div key={step.number} className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm">
                <RunStatusIcon
                  status={step.status}
                  conclusion={step.conclusion}
                  className={cn("h-4 w-4 shrink-0", statusIconColor(step.status, step.conclusion))}
                />
                <span className="flex min-w-0 flex-1 items-center">
                  <a
                    href={`${liveJob.htmlUrl}#step:${step.number}:1`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-block max-w-full truncate hover:underline"
                  >
                    {step.name}
                  </a>
                </span>
                {stepDuration(step) && <span className="shrink-0 text-xs text-muted-foreground">{stepDuration(step)}</span>}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 justify-end border-t border-border px-5 py-4">
        <a href={liveJob.htmlUrl} target="_blank" rel="noreferrer">
          <Button variant="outline" size="sm">View On GitHub</Button>
        </a>
      </div>
    </DialogContent>
  );
}

export function JobStepsDialog({
  slug,
  runId,
  job,
  onClose,
}: {
  slug: string;
  runId: number;
  job: WorkflowJob | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!job} onOpenChange={(next) => !next && onClose()}>
      {job && <JobStepsDialogContent key={job.id} slug={slug} runId={runId} job={job} />}
    </Dialog>
  );
}
