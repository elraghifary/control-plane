"use client";

import * as React from "react";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import type { WorkflowJob, WorkflowRun } from "@/lib/data/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isFailedRun, formatDuration } from "./actions-utils";
import { RunStatusIcon, statusIconColor } from "./run-status-icon";
import { JobStepsDialog } from "./job-steps-dialog";
import { fetchWorkflowJobs, rerunWorkflowAction, rerunFailedJobsAction } from "@/app/(app)/actions/actions";

function jobDuration(job: WorkflowJob): string | null {
  if (!job.startedAt || !job.completedAt) return null;
  const seconds = Math.max(0, Math.round((new Date(job.completedAt).getTime() - new Date(job.startedAt).getTime()) / 1000));
  return formatDuration(seconds);
}

export function WorkflowRunCard({ slug, run, contextLabel }: { slug: string; run: WorkflowRun; contextLabel: string }) {
  const [jobs, setJobs] = React.useState<WorkflowJob[] | null>(null);
  const [rerunning, setRerunning] = React.useState<"all" | "failed" | null>(null);
  const [selectedJob, setSelectedJob] = React.useState<WorkflowJob | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetchWorkflowJobs(slug, run.id).then((result) => { if (!cancelled) setJobs(result); });
    return () => { cancelled = true; };
  }, [slug, run.id]);

  async function rerun(kind: "all" | "failed") {
    setRerunning(kind);
    const res = kind === "all" ? await rerunWorkflowAction(slug, run.id) : await rerunFailedJobsAction(slug, run.id);
    setRerunning(null);
    if (!res.ok) {
      toast.error(res.error ?? "Rerun failed");
      return;
    }
    const what = kind === "all" ? run.name : `failed jobs in ${run.name}`;
    toast.success(`Rerunning ${what} #${run.runNumber} for ${contextLabel}`);
  }

  const failed = isFailedRun(run.status, run.conclusion);
  const rerunActions = run.status === "completed" && (
    <div className="ml-auto flex shrink-0 gap-1.5">
      <Button variant="outline" size="xs" loading={rerunning === "all"} disabled={rerunning !== null} onClick={() => rerun("all")}>
        {rerunning === "all" ? "Rerunning…" : "Rerun"}
      </Button>
      {failed && (
        <Button size="xs" loading={rerunning === "failed"} disabled={rerunning !== null} onClick={() => rerun("failed")}>
          {rerunning === "failed" ? "Rerunning…" : "Rerun Failed Jobs"}
        </Button>
      )}
    </div>
  );

  if (jobs === null) {
    return (
      <div className="flex items-center gap-2 px-1 py-1 text-xs text-muted-foreground">
        <RunStatusIcon status={run.status} conclusion={run.conclusion} className={cn("h-3.5 w-3.5 shrink-0", statusIconColor(run.status, run.conclusion))} />
        <span className="min-w-0 flex-1 truncate">{run.name} #{run.runNumber} — Loading jobs…</span>
      </div>
    );
  }

  if (jobs.length === 0) {
    return (
      <div className="flex items-center gap-2 px-1 py-1 text-xs">
        <RunStatusIcon status={run.status} conclusion={run.conclusion} className={cn("h-3.5 w-3.5 shrink-0", statusIconColor(run.status, run.conclusion))} />
        <span className="min-w-0 flex-1 truncate text-muted-foreground">{run.name} #{run.runNumber} — no jobs found</span>
        {rerunActions}
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {jobs.map((job, i) => (
        <div key={job.id} className="flex min-w-0 flex-wrap items-center gap-2 rounded-lg px-1 py-1 text-xs">
          <RunStatusIcon status={job.status} conclusion={job.conclusion} className={cn("h-3.5 w-3.5 shrink-0", statusIconColor(job.status, job.conclusion))} />
          <a href={run.htmlUrl} target="_blank" rel="noreferrer" className="inline-block max-w-full truncate hover:underline">
            {run.name} #{run.runNumber}
          </a>
          <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground/50" />
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <button type="button" onClick={() => setSelectedJob(job)} className="inline-block max-w-full truncate text-left hover:underline">
              {job.name}
            </button>
            {jobDuration(job) && <span className="shrink-0 text-muted-foreground">{jobDuration(job)}</span>}
          </span>
          {i === jobs.length - 1 && rerunActions}
        </div>
      ))}
      <JobStepsDialog slug={slug} runId={run.id} job={selectedJob} onClose={() => setSelectedJob(null)} />
    </div>
  );
}
