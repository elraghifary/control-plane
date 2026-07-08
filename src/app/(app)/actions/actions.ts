"use server";

import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data/get-data-service";
import type { WorkflowJob } from "@/lib/data/types";

export async function fetchWorkflowJobs(slug: string, runId: number): Promise<WorkflowJob[]> {
  const data = await getDataService();
  return data.listWorkflowJobs(slug, runId);
}

export async function rerunWorkflowAction(slug: string, runId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.rerunWorkflow(slug, runId);
    revalidatePath("/actions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Rerun failed" };
  }
}

export async function rerunFailedJobsAction(slug: string, runId: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.rerunFailedJobs(slug, runId);
    revalidatePath("/actions");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Rerun failed" };
  }
}
