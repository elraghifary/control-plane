import { data } from "@/lib/data";
import { DashboardView } from "@/components/dashboard/dashboard-view";

export default async function DashboardPage() {
  const slug = "dashboard";
  const [summary, envs, merge, release, timeline] = await Promise.all([
    data.getDashboardSummary(slug),
    data.getEnvironmentStatuses(slug),
    data.getMergeActivity(slug),
    data.getReleaseFrequency(slug),
    data.getDeploymentTimeline(slug),
  ]);
  return <DashboardView summary={summary} envs={envs} merge={merge} release={release} timeline={timeline} />;
}
