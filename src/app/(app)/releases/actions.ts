"use server";

import { revalidatePath } from "next/cache";
import { getDataService } from "@/lib/data/get-data-service";
import type { PublishReleaseResult } from "@/lib/data/types";

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
