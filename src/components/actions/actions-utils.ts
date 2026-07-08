import type { WorkflowRun, WorkflowRunConclusion, WorkflowRunStatus } from "@/lib/data/types";
import type { StatusBadgeVariant } from "@/components/pull-requests/pr-utils";

export function runStatusLabel(status: WorkflowRunStatus, conclusion: WorkflowRunConclusion): string {
  if (status !== "completed") return status === "in_progress" ? "In Progress" : "Queued";
  return {
    success: "Success",
    failure: "Failed",
    cancelled: "Cancelled",
    skipped: "Skipped",
    neutral: "Neutral",
    timed_out: "Timed Out",
    action_required: "Action Required",
    stale: "Stale",
  }[conclusion ?? "neutral"] ?? "Unknown";
}

export function runStatusBadgeVariant(status: WorkflowRunStatus, conclusion: WorkflowRunConclusion): StatusBadgeVariant {
  if (status !== "completed") return "warn";
  if (conclusion === "success") return "healthy";
  if (conclusion === "failure" || conclusion === "timed_out") return "error";
  if (conclusion === "action_required") return "warn";
  return "secondary";
}

export function isFailedRun(status: WorkflowRunStatus, conclusion: WorkflowRunConclusion): boolean {
  return status === "completed" && (conclusion === "failure" || conclusion === "timed_out" || conclusion === "action_required");
}

const CONCLUSION_SEVERITY: WorkflowRunConclusion[] = [
  "failure", "timed_out", "action_required", "cancelled", "stale", "neutral", "skipped", "success",
];

/** Worst-case status/conclusion across a group's runs, for the collapsed header badge. */
export function aggregateRunStatus(runs: WorkflowRun[]): { status: WorkflowRunStatus; conclusion: WorkflowRunConclusion } {
  if (runs.some((r) => r.status === "in_progress")) return { status: "in_progress", conclusion: null };
  if (runs.some((r) => r.status === "queued")) return { status: "queued", conclusion: null };
  let worst: WorkflowRunConclusion = "success";
  for (const r of runs) {
    const conclusion = r.conclusion ?? "neutral";
    if (CONCLUSION_SEVERITY.indexOf(conclusion) < CONCLUSION_SEVERITY.indexOf(worst)) worst = conclusion;
  }
  return { status: "completed", conclusion: worst };
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.round(diffMs / 1000);
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60],
  ];
  for (const [unit, secondsInUnit] of units) {
    const value = Math.floor(diffSec / secondsInUnit);
    if (value >= 1) {
      return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(-value, unit);
    }
  }
  return "just now";
}
