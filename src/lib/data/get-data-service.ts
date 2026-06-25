import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { store } from "@/lib/store";
import { decryptPat } from "@/lib/auth/crypto";
import type { DataService } from "./data-service";
import { OctokitDataService } from "./octokit-data-service";

function orgs(): string[] {
  return (process.env.CONTROL_PLANE_GITHUB_ORGS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

// React.cache memoizes per request render, so the layout and page share one
// service instance (and its in-memory cache) instead of building two.
export const getDataService = cache(async (): Promise<DataService> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const user = await store.getUserById(session.user.id);
  if (!user) redirect("/login");
  return new OctokitDataService(decryptPat(user.patEncrypted), orgs());
});
