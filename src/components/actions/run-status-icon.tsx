import { CheckCircle2, XCircle, Loader2, MinusCircle, AlertTriangle } from "lucide-react";
import type { WorkflowRunConclusion, WorkflowRunStatus } from "@/lib/data/types";
import { cn } from "@/lib/utils";

export function statusIconColor(status: WorkflowRunStatus, conclusion: WorkflowRunConclusion): string {
  if (status !== "completed") return "text-status-warn";
  if (conclusion === "success") return "text-status-healthy";
  if (conclusion === "failure" || conclusion === "timed_out") return "text-status-error";
  if (conclusion === "action_required") return "text-status-warn";
  return "text-muted-foreground";
}

export function RunStatusIcon({
  status,
  conclusion,
  className,
}: {
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  className?: string;
}) {
  if (status !== "completed") return <Loader2 className={cn(className, status === "in_progress" && "animate-spin")} />;
  if (conclusion === "success") return <CheckCircle2 className={className} />;
  if (conclusion === "failure" || conclusion === "timed_out") return <XCircle className={className} />;
  if (conclusion === "action_required") return <AlertTriangle className={className} />;
  return <MinusCircle className={className} />;
}
