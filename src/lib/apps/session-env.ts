import "server-only";
import { cookies } from "next/headers";
import { isEnvironment, type Environment } from "./env-config";

export async function getSelectedEnvironment(): Promise<Environment> {
  const value = (await cookies()).get("cp-app-secrets-env")?.value;
  return value && isEnvironment(value) ? value : "development";
}
