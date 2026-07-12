import { ENVIRONMENTS } from "@/lib/apps/env-config";
import { isEnvConfigured } from "@/lib/apps/firebase-admin";
import { getSelectedEnvironment } from "@/lib/apps/session-env";
import {
  getEnvInfoAction,
  countAuditAction,
  listSecretsAction,
  listFeatureFlagsAction,
  getUpdateConfigAction,
  getIapConfigAction,
} from "./actions";
import { EnvShell } from "@/components/apps/env-shell";

export default async function AppsLayout({ children }: { children: React.ReactNode }) {
  const environment = await getSelectedEnvironment();
  const environments = ENVIRONMENTS.map((e) => ({ ...e, configured: isEnvConfigured(e.id) }));
  const [infoRes, auditCountRes, secretsRes, flagsRes, updateConfigRes, iapConfigRes] = await Promise.all([
    getEnvInfoAction(environment),
    countAuditAction(environment),
    listSecretsAction(environment),
    listFeatureFlagsAction(environment),
    getUpdateConfigAction(environment),
    getIapConfigAction(environment),
  ]);
  const version = infoRes.ok ? (infoRes.info?.version ?? null) : null;
  const auditCount = auditCountRes.ok ? auditCountRes.count : null;
  const secretCount = secretsRes.ok ? secretsRes.secrets.length : null;
  const flagCount = flagsRes.ok ? flagsRes.flags.length : null;
  const updateConfig = updateConfigRes.ok ? updateConfigRes.config : null;
  const iapConfig = iapConfigRes.ok ? iapConfigRes.config : null;

  return (
    <div>
      <h1 className="text-lg font-medium">Apps</h1>
      <div className="mt-5">
        <EnvShell
          environment={environment}
          environments={environments}
          version={version}
          auditCount={auditCount}
          secretCount={secretCount}
          flagCount={flagCount}
          updateConfig={updateConfig}
          iapConfig={iapConfig}
        >
          {children}
        </EnvShell>
      </div>
    </div>
  );
}
