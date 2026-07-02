"use server";

import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data/get-data-service";
import type { PullRequestReviewEvent } from "@/lib/data/data-service";
import type { PullRequest, StagingSyncResult, StagingCreateResult, StagingPrepareResult, PullRequestFileChange, ReviewCommentSide } from "@/lib/data/types";

export async function fetchPullRequest(slug: string, number: number): Promise<PullRequest> {
  const data = await getDataService();
  return data.getPullRequest(slug, number);
}

export async function submitReview(
  slug: string,
  number: number,
  event: PullRequestReviewEvent,
  body?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.submitPullRequestReview(slug, number, event, body);
    revalidatePath("/pull-requests");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Review failed" };
  }
}

export async function mergePullRequest(
  slug: string,
  number: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.mergePullRequest(slug, number);
    revalidatePath("/pull-requests");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Merge failed" };
  }
}

export async function closePullRequest(
  slug: string,
  number: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.closePullRequest(slug, number);
    revalidatePath("/pull-requests");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Close failed" };
  }
}

export async function reopenPullRequest(
  slug: string,
  number: number,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.reopenPullRequest(slug, number);
    revalidatePath("/pull-requests");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Reopen failed" };
  }
}

export async function submitLineComment(
  slug: string,
  number: number,
  commitId: string,
  path: string,
  line: number,
  side: ReviewCommentSide,
  body: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.createReviewComment(slug, number, { commitId, path, line, side, body });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Comment failed" };
  }
}

export async function fetchPullRequestFiles(slug: string, number: number) {
  const data = await getDataService();
  return data.getPullRequestFiles(slug, number);
}

export async function submitReviewAndMerge(
  slug: string,
  number: number,
  body?: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const data = await getDataService();
    await data.submitPullRequestReview(slug, number, "APPROVE", body);
    await data.mergePullRequest(slug, number);
    revalidatePath("/pull-requests");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Review and merge failed" };
  }
}

export async function createStagingSync(slug: string): Promise<StagingSyncResult> {
  const data = await getDataService();
  const result = await data.createAndMergeStagingPR(slug);
  revalidatePath("/pull-requests/staging");
  return result;
}

export async function prepareStagingPR(slug: string): Promise<StagingPrepareResult> {
  const data = await getDataService();
  return data.prepareStagingPR(slug);
}

export async function syncStaging(slugs: string[]): Promise<StagingCreateResult[]> {
  const data = await getDataService();
  const results = await Promise.all(slugs.map((slug) => data.createStagingPR(slug)));
  revalidatePath("/pull-requests");
  return results;
}

export async function compareBranchesAction(slug: string, base: string, head: string): Promise<PullRequestFileChange[]> {
  const data = await getDataService();
  return data.compareBranches(slug, base, head);
}

export async function listBranchesAction(slug: string): Promise<string[]> {
  const data = await getDataService();
  return data.listBranches(slug);
}

export async function createPullRequestAction(
  slug: string,
  title: string,
  head: string,
  base: string,
  body: string,
): Promise<{ ok: boolean; number?: number; htmlUrl?: string; error?: string }> {
  try {
    const data = await getDataService();
    const result = await data.createPullRequest(slug, title, head, base, body);
    revalidatePath("/pull-requests");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Failed to create pull request" };
  }
}
