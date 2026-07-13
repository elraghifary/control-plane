"use server";

import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data/get-data-service";
import { triggerProductionRelease, resolveQueueItemBuildUrl } from "@/lib/jenkins/client";
import type { DataService } from "@/lib/data/data-service";
import type { PublishReleaseResult } from "@/lib/data/types";

async function describeSyncFailure(data: DataService, slug: string, number: number, targetBranch: string): Promise<string | null> {
  try {
    const pr = await data.getPullRequest(slug, number);
    if (pr.checksStatus === "failure") return `Sync failed — checks failing on development: ${pr.failingChecks.join(", ")}`;
    if (!pr.mergeable) return `Sync failed — development has merge conflicts with ${targetBranch}. Resolve them, then try again.`;
    if (pr.checksStatus === "pending") return "Sync failed — checks are still running on development. Try again once they finish.";
    return null;
  } catch {
    return null;
  }
}

export async function listBranchesAction(slug: string): Promise<string[]> {
  try {
    const data = await getDataService();
    return data.listBranches(slug);
  } catch {
    return [];
  }
}

export async function getReleaseContextAction(
  slug: string,
): Promise<{ latestTag: string | null; defaultBranch: string }> {
  const data = await getDataService();
  const releases = await data.listReleases(slug);
  const latestTag = releases.find((r) => r.isLatest)?.tagName ?? releases[0]?.tagName ?? null;
  const defaultBranch = releases[0]?.targetBranch ?? "main";
  return { latestTag, defaultBranch };
}

export async function getReleaseTagsAction(slug: string): Promise<string[]> {
  const data = await getDataService();
  const releases = await data.listReleases(slug);
  return releases.map((r) => r.tagName);
}

export async function generateReleaseNotesAction(
  slug: string,
  tagName: string,
  targetBranch: string,
  previousTag?: string,
): Promise<string> {
  const data = await getDataService();
  return data.generateReleaseNotes(slug, tagName, targetBranch, previousTag);
}

export async function syncBranchAction(
  slug: string,
  targetBranch: string,
): Promise<{ ok: boolean; alreadySynced?: boolean; error?: string }> {
  const data = await getDataService();
  const label = targetBranch.charAt(0).toUpperCase() + targetBranch.slice(1);
  let pr: { number: number; htmlUrl: string };
  try {
    pr = await data.createPullRequest(
      slug,
      `Sync Development to ${label}`,
      "development",
      targetBranch,
      `📦 Sync Development to ${label}\n\nThis PR merges the development branch into ${targetBranch} before the release.`,
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    if (/no commits|already|up.to.date/i.test(msg)) return { ok: true, alreadySynced: true };
    return { ok: false, error: msg };
  }

  try {
    await data.mergePullRequest(slug, pr.number);
    return { ok: true };
  } catch (e) {
    const reason = await describeSyncFailure(data, slug, pr.number, targetBranch);
    const msg = e instanceof Error ? e.message : "Sync failed";
    return { ok: false, error: reason ?? msg };
  }
}

export async function publishReleaseAction(
  slug: string,
  tagName: string,
  targetBranch: string,
  body: string,
): Promise<{ ok: boolean; result?: PublishReleaseResult; error?: string }> {
  try {
    const data = await getDataService();
    const result = await data.publishRelease(slug, tagName, targetBranch, body);
    revalidatePath("/releases");
    revalidatePath("/dashboard");
    return { ok: true, result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Publish failed" };
  }
}

export async function releaseProductionAction(
  repoName: string,
  tag: string,
): Promise<{ ok: boolean; queueUrl?: string | null; error?: string }> {
  try {
    const result = await triggerProductionRelease(repoName, tag);
    return { ok: true, queueUrl: result.queueUrl };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not trigger production release" };
  }
}

export async function resolveJenkinsBuildUrlAction(
  queueUrl: string,
): Promise<{ ok: boolean; buildUrl?: string | null; error?: string }> {
  try {
    return { ok: true, buildUrl: await resolveQueueItemBuildUrl(queueUrl) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not resolve build" };
  }
}
