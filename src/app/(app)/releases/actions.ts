"use server";

import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data/get-data-service";
import type { DataService } from "@/lib/data/data-service";
import type { PublishReleaseResult } from "@/lib/data/types";
import { listSprints, listWorkspaceMembers, listSprintTasks, createSignoffDoc } from "@/lib/clickup/client";
import { buildSignoffMarkdown, type SignoffInput } from "@/lib/clickup/signoff-markdown";
import type { ClickUpSprint, ClickUpMember, ClickUpSignoffTask } from "@/lib/clickup/types";

async function describeSyncFailure(data: DataService, slug: string, number: number): Promise<string | null> {
  try {
    const pr = await data.getPullRequest(slug, number);
    if (pr.checksStatus === "failure") return `Sync failed — checks failing on development: ${pr.failingChecks.join(", ")}`;
    if (!pr.mergeable) return "Sync failed — development has merge conflicts with main. Resolve them, then try again.";
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

export async function generateReleaseNotesAction(
  slug: string,
  tagName: string,
  targetBranch: string,
  previousTag?: string,
): Promise<string> {
  const data = await getDataService();
  return data.generateReleaseNotes(slug, tagName, targetBranch, previousTag);
}

export async function syncMainAction(
  slug: string,
): Promise<{ ok: boolean; alreadySynced?: boolean; error?: string }> {
  const data = await getDataService();
  let pr: { number: number; htmlUrl: string };
  try {
    pr = await data.createPullRequest(
      slug,
      "Sync Development to Main",
      "development",
      "main",
      "📦 Sync Development to Main\n\nThis PR merges the development branch into main before the release.",
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
    const reason = await describeSyncFailure(data, slug, pr.number);
    const msg = e instanceof Error ? e.message : "Sync failed";
    return { ok: false, error: reason ?? msg };
  }
}

export async function listSignoffSprintsAction(): Promise<{ ok: boolean; sprints: ClickUpSprint[]; error?: string }> {
  try {
    return { ok: true, sprints: await listSprints() };
  } catch (e) {
    return { ok: false, sprints: [], error: e instanceof Error ? e.message : "Could not load sprints" };
  }
}

export async function listSignoffMembersAction(): Promise<{ ok: boolean; members: ClickUpMember[]; error?: string }> {
  try {
    return { ok: true, members: await listWorkspaceMembers() };
  } catch (e) {
    return { ok: false, members: [], error: e instanceof Error ? e.message : "Could not load workspace members" };
  }
}

export async function listSignoffTasksAction(
  sprintListId: string,
): Promise<{ ok: boolean; tasks: ClickUpSignoffTask[]; error?: string }> {
  try {
    return { ok: true, tasks: await listSprintTasks(sprintListId) };
  } catch (e) {
    return { ok: false, tasks: [], error: e instanceof Error ? e.message : "Could not load sprint tasks" };
  }
}

export async function getLatestTagAction(slug: string): Promise<string | null> {
  try {
    const data = await getDataService();
    const releases = await data.listReleases(slug);
    return releases.find((r) => r.isLatest)?.tagName ?? releases[0]?.tagName ?? null;
  } catch {
    return null;
  }
}

export async function createSignoffAction(
  input: SignoffInput,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const content = buildSignoffMarkdown(input);
    const name = `${input.sprintName} - ${input.deploymentDate}`;
    const doc = await createSignoffDoc(name, content);
    return { ok: true, url: doc.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create sign-off doc" };
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
