import "server-only";
import { cert, getApp, getApps, initializeApp, type App, type ServiceAccount } from "firebase-admin/app";
import { getFirestore as adminGetFirestore, type Firestore } from "firebase-admin/firestore";
import { getEnvMeta, type Environment } from "./env-config";

function decodeServiceAccount(b64: string) {
  const json = Buffer.from(b64, "base64").toString("utf8");
  return JSON.parse(json) as { project_id: string; client_email: string; private_key: string };
}

export function isEnvConfigured(env: Environment): boolean {
  const meta = getEnvMeta(env);
  return !!meta && !!process.env[meta.saEnvVar];
}

function getApp_(env: Environment): App {
  const meta = getEnvMeta(env);
  if (!meta) throw new Error(`Unknown environment: ${env}`);
  const b64 = process.env[meta.saEnvVar];
  if (!b64) throw new Error(`${meta.saEnvVar} is not set (environment "${env}" not configured)`);

  const appName = `cp-${env}`;
  const existing = getApps().find((a) => a.name === appName);
  if (existing) return getApp(appName);

  const sa = decodeServiceAccount(b64);
  // firebase-admin's ServiceAccount type declares camelCase fields (projectId, clientEmail,
  // privateKey), but the raw service-account JSON from Google Cloud uses snake_case. TS flags
  // this as "no properties in common" even though cert()'s runtime implementation reads both
  // cases via copyAttr. Bridge through `unknown` rather than renaming fields, so the decoded
  // object stays a faithful copy of the source JSON.
  return initializeApp({ credential: cert(sa as unknown as ServiceAccount) }, appName);
}

export function getFirestore(env: Environment): Firestore {
  return adminGetFirestore(getApp_(env));
}
