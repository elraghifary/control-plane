import { getSelectedEnvironment } from "@/lib/apps/session-env";
import { getIapConfigAction } from "@/app/(app)/apps/actions";
import { IapConfigForm } from "@/components/apps/iap-config-form";
import { ErrorState } from "@/components/states/error-state";

export default async function AppsInAppPurchasesPage() {
  const environment = await getSelectedEnvironment();
  const res = await getIapConfigAction(environment);

  if (!res.ok) {
    return <ErrorState title="Failed to load in-app purchases config" description={res.error} />;
  }

  return <IapConfigForm environment={environment} initialConfig={res.config} />;
}
