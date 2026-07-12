export type Environment = "development" | "preview" | "production";

export interface EnvMeta {
  id: Environment;
  label: string;
  saEnvVar: string;
}

export const ENVIRONMENTS: EnvMeta[] = [
  { id: "development", label: "Development", saEnvVar: "FIREBASE_SA_DEVELOPMENT" },
  { id: "preview", label: "Preview", saEnvVar: "FIREBASE_SA_PREVIEW" },
  { id: "production", label: "Production", saEnvVar: "FIREBASE_SA_PRODUCTION" },
];

export function getEnvMeta(env: string): EnvMeta | undefined {
  return ENVIRONMENTS.find((e) => e.id === env);
}

export function isEnvironment(v: string): v is Environment {
  return ENVIRONMENTS.some((e) => e.id === v);
}
