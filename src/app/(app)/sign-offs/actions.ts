"use server";

import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data/get-data-service";
import {
  listSprints,
  listWorkspaceMembers,
  listSprintTasks,
  createSignoffPage,
  listSignoffPages,
  getSignoffPageContent,
  updateSignoffPage,
  shareSignoffToProductSync,
} from "@/lib/clickup/client";
import { buildSignoffMarkdown, buildSignoffShareMessage, type SignoffInput } from "@/lib/clickup/signoff-markdown";
import type { ClickUpSprint, ClickUpMember, ClickUpSignoffTask, ClickUpSignoffPage } from "@/lib/clickup/types";

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
    const name = `${input.deploymentDate}`;
    const page = await createSignoffPage(name, content);
    revalidatePath("/sign-offs");
    return { ok: true, url: page.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create sign-off doc" };
  }
}

export async function shareSignoffAction(sprintName: string, url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    await shareSignoffToProductSync(buildSignoffShareMessage(sprintName, url));
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not share to Product Sync" };
  }
}

export async function listSignoffPagesAction(): Promise<{ ok: boolean; pages: ClickUpSignoffPage[]; error?: string }> {
  try {
    return { ok: true, pages: await listSignoffPages() };
  } catch (e) {
    return { ok: false, pages: [], error: e instanceof Error ? e.message : "Could not load sign-off docs" };
  }
}

export async function fetchSignoffPageContentAction(
  pageId: string,
): Promise<{ ok: boolean; content?: string; error?: string }> {
  try {
    const content = await getSignoffPageContent(pageId);
    if (content === null) return { ok: false, error: "No page found for this document" };
    return { ok: true, content };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load document content" };
  }
}

export async function saveSignoffPageContentAction(
  pageId: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateSignoffPage(pageId, content);
    revalidatePath("/sign-offs");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save document" };
  }
}
