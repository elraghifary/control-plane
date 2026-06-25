import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDataService } from "@/lib/data/get-data-service";
import { DashboardView } from "@/components/dashboard/dashboard-view";
import { EmptyState } from "@/components/states/empty-state";
import { ErrorState } from "@/components/states/error-state";

export default async function DashboardPage() {
  const data = await getDataService();

  try {
    const repos = await data.listRepositories();
    const cookieSlug = (await cookies()).get("cp-repo")?.value;
    const slug = repos.find((r) => r.slug === cookieSlug)?.slug ?? repos[0]?.slug;
    if (!slug) {
      return <EmptyState title="No repositories" description="This GitHub token can't see any repositories yet." />;
    }
    const [summary, envs, merge, release, timeline] = await Promise.all([
      data.getDashboardSummary(slug),
      data.getEnvironmentStatuses(slug),
      data.getMergeActivity(slug),
      data.getReleaseFrequency(slug),
      data.getDeploymentTimeline(slug),
    ]);
    return <DashboardView summary={summary} envs={envs} merge={merge} release={release} timeline={timeline} />;
  } catch (e) {
    const status = (e as { status?: number }).status;
    if (status === 401) redirect("/login");
    return (
      <ErrorState
        title="Couldn't reach GitHub"
        description={status === 403 ? "GitHub rate limit hit — try again shortly." : "The GitHub API request failed. Check your token in settings."}
      />
    );
  }
}
