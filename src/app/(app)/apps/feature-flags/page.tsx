import { getSelectedEnvironment } from "@/lib/apps/session-env";
import { listFeatureFlagsAction } from "@/app/(app)/apps/actions";
import { FeatureFlagList } from "@/components/apps/feature-flag-list";
import { ErrorState } from "@/components/states/error-state";

export default async function AppsFeatureFlagsPage() {
  const environment = await getSelectedEnvironment();
  const res = await listFeatureFlagsAction(environment);

  if (!res.ok) {
    return <ErrorState title="Failed to load feature flags" description={res.error} />;
  }

  return <FeatureFlagList environment={environment} initialFlags={res.flags} />;
}
