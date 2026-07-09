"use server";

import { revalidatePath } from "next/cache";
import {
  listSprints,
  createManifestPage,
  listManifestPages,
  getManifestPageContent,
  updateManifestPage,
} from "@/lib/clickup/client";
import { buildManifestMarkdown, parseManifestMarkdown, emptyManifestInput, type ManifestInput } from "@/lib/clickup/manifest-markdown";
import type { ClickUpSprint, ClickUpManifestPage } from "@/lib/clickup/types";

export async function listManifestSprintsAction(): Promise<{ ok: boolean; sprints: ClickUpSprint[]; error?: string }> {
  try {
    return { ok: true, sprints: await listSprints() };
  } catch (e) {
    return { ok: false, sprints: [], error: e instanceof Error ? e.message : "Could not load sprints" };
  }
}

export async function listManifestPagesAction(): Promise<{ ok: boolean; pages: ClickUpManifestPage[]; error?: string }> {
  try {
    return { ok: true, pages: await listManifestPages() };
  } catch (e) {
    return { ok: false, pages: [], error: e instanceof Error ? e.message : "Could not load manifest docs" };
  }
}

export async function checkManifestSprintExistsAction(
  sprintName: string,
): Promise<{ ok: boolean; existingPage?: ClickUpManifestPage; error?: string }> {
  try {
    const pages = await listManifestPages();
    const existingPage = pages.find((p) => p.name.trim().toLowerCase() === sprintName.trim().toLowerCase());
    return { ok: true, existingPage };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not check existing manifests" };
  }
}

export async function createManifestAction(
  sprintName: string,
): Promise<{ ok: boolean; url?: string; error?: string }> {
  try {
    const pages = await listManifestPages();
    const existing = pages.find((p) => p.name.trim().toLowerCase() === sprintName.trim().toLowerCase());
    if (existing) return { ok: false, error: "A manifest for this sprint already exists" };

    const content = buildManifestMarkdown(emptyManifestInput());
    const page = await createManifestPage(sprintName, content);
    revalidatePath("/manifests");
    return { ok: true, url: page.url };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create manifest doc" };
  }
}

export async function fetchManifestPageContentAction(
  pageId: string,
): Promise<{ ok: boolean; data?: ManifestInput; error?: string }> {
  try {
    const content = await getManifestPageContent(pageId);
    if (content === null) return { ok: false, error: "No page found for this document" };
    return { ok: true, data: parseManifestMarkdown(content) };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not load document content" };
  }
}

export async function saveManifestPageContentAction(
  pageId: string,
  data: ManifestInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    await updateManifestPage(pageId, buildManifestMarkdown(data));
    revalidatePath("/manifests");
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not save document" };
  }
}
