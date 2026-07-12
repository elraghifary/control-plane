import { getSelectedEnvironment } from "@/lib/apps/session-env";
import { getUpdateConfigAction } from "@/app/(app)/apps/actions";
import { UpdateConfigForm } from "@/components/apps/update-config-form";
import { ErrorState } from "@/components/states/error-state";

export default async function AppsUpdatesPage() {
  const environment = await getSelectedEnvironment();
  const res = await getUpdateConfigAction(environment);

  if (!res.ok) {
    return <ErrorState title="Failed to load update config" description={res.error} />;
  }

  return <UpdateConfigForm environment={environment} initialConfig={res.config} />;
}
