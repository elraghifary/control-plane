"use client";

import * as React from "react";
import type { Environment } from "@/lib/apps/env-config";

const STORAGE_KEY = "app-secrets-prod-armed";

interface WriteGuardValue {
  environment: Environment;
  writesAllowed: boolean;
  armed: boolean;
  arm: () => void;
  disarm: () => void;
}

const WriteGuardContext = React.createContext<WriteGuardValue | null>(null);

export function WriteGuardProvider({ environment, children }: { environment: Environment; children: React.ReactNode }) {
  const [armed, setArmed] = React.useState(false);

  React.useEffect(() => {
    React.startTransition(() => setArmed(sessionStorage.getItem(STORAGE_KEY) === "true"));
  }, []);

  const arm = React.useCallback(() => {
    sessionStorage.setItem(STORAGE_KEY, "true");
    setArmed(true);
  }, []);

  const disarm = React.useCallback(() => {
    sessionStorage.removeItem(STORAGE_KEY);
    setArmed(false);
  }, []);

  const writesAllowed = environment !== "production" || armed;

  const value = React.useMemo(
    () => ({ environment, writesAllowed, armed, arm, disarm }),
    [environment, writesAllowed, armed, arm, disarm],
  );

  return <WriteGuardContext.Provider value={value}>{children}</WriteGuardContext.Provider>;
}

export function useWriteGuard(): WriteGuardValue {
  const ctx = React.useContext(WriteGuardContext);
  if (!ctx) throw new Error("useWriteGuard must be used within a WriteGuardProvider");
  return ctx;
}
