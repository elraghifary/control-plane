import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataService } from "@/lib/data/get-data-service";
import type { Repository, DashboardSummary, EnvironmentStatus, MergeActivityPoint } from "@/lib/data/types";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";

export default async function DashboardPage() {
  const data = await getDataService();

  let empty = false;
  let errorStatus: number | undefined;
  let repositories: Repository[] = [];
  let selectedSlug = "";
  let summary: DashboardSummary | undefined;
  let envs: EnvironmentStatus[] | undefined;
  let merge: MergeActivityPoint[] | undefined;

  try {
    repositories = await data.listRepositories();
    const cookieSlug = (await cookies()).get("cp-repository")?.value;
    selectedSlug = repositories.find((r) => r.slug === cookieSlug)?.slug ?? repositories[0]?.slug ?? "";
    if (selectedSlug) {
      [summary, envs, merge] = await Promise.all([
        data.getDashboardSummary(selectedSlug),
        data.getEnvironmentStatuses(selectedSlug),
        data.getMergeActivity(selectedSlug),
      ]);
    } else {
      empty = true;
    }
  } catch (e) {
    errorStatus = (e as { status?: number }).status;
    if (errorStatus === 401) redirect("/login");
  }

  if (empty)
    return (
      <EmptyState
        title="No repositories"
        description="Set CONTROL_PLANE_GITHUB_ORGS in your environment (e.g. happykids-id) so org repositories appear here."
      />
    );
  if (!summary || !envs || !merge)
    return (
      <ErrorState
        title="Couldn't reach GitHub"
        description={errorStatus === 403 ? "GitHub rate limit hit — try again shortly." : "The GitHub API request failed. Check your token in settings."}
      />
    );
  return <DashboardView summary={summary} envs={envs} merge={merge} repositories={repositories} selectedSlug={selectedSlug} />;
}
