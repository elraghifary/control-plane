import { getSelectedEnvironment } from "@/lib/apps/session-env";
import { listSecretsAction } from "@/app/(app)/apps/actions";
import { SecretList } from "@/components/apps/secret-list";
import { ErrorState } from "@/components/states/error-state";

export default async function AppsSecretsPage() {
  const environment = await getSelectedEnvironment();
  const secretsRes = await listSecretsAction(environment);

  if (!secretsRes.ok) {
    return <ErrorState title="Failed to load secrets" description={secretsRes.error} />;
  }

  return <SecretList environment={environment} initialSecrets={secretsRes.secrets} />;
}
