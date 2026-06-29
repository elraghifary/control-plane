"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { RouteLoaderOverlay } from "@/components/ui/route-loader-overlay";

interface NavigationLoadingContextValue {
  navigate: (href: string) => void;
  refresh: () => void;
  replaceAndRefresh: (href: string) => void;
  withLoading: <T>(fn: () => Promise<T>) => Promise<T>;
  runThenRefresh: (fn: () => Promise<boolean>) => Promise<void>;
}

const NavigationLoadingContext = React.createContext<NavigationLoadingContextValue | null>(null);

export function NavigationLoadingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [taskCount, setTaskCount] = React.useState(0);
  const [transitionPending, startTransition] = React.useTransition();
  const transitionTasks = React.useRef(0);

  const beginTransitionTask = React.useCallback(() => {
    transitionTasks.current += 1;
    setTaskCount((c) => c + 1);
  }, []);

  const endTransitionTask = React.useCallback(() => {
    if (transitionTasks.current <= 0) return;
    transitionTasks.current -= 1;
    setTaskCount((c) => Math.max(0, c - 1));
  }, []);

  React.useEffect(() => {
    if (!transitionPending && transitionTasks.current > 0) {
      const pending = transitionTasks.current;
      transitionTasks.current = 0;
      setTaskCount((c) => Math.max(0, c - pending));
    }
  }, [transitionPending]);

  const navigate = React.useCallback(
    (href: string) => {
      beginTransitionTask();
      startTransition(() => router.push(href));
    },
    [router, beginTransitionTask],
  );

  const refresh = React.useCallback(() => {
    beginTransitionTask();
    startTransition(() => router.refresh());
  }, [router, beginTransitionTask]);

  const replaceAndRefresh = React.useCallback(
    (href: string) => {
      beginTransitionTask();
      startTransition(() => { router.replace(href); router.refresh(); });
    },
    [router, beginTransitionTask],
  );

  const withLoading = React.useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    setTaskCount((c) => c + 1);
    try {
      return await fn();
    } finally {
      setTaskCount((c) => Math.max(0, c - 1));
    }
  }, []);

  const runThenRefresh = React.useCallback(
    async (fn: () => Promise<boolean>) => {
      beginTransitionTask();
      const ok = await fn();
      if (!ok) {
        endTransitionTask();
        return;
      }
      startTransition(() => router.refresh());
    },
    [router, beginTransitionTask, endTransitionTask],
  );

  return (
    <NavigationLoadingContext.Provider value={{ navigate, refresh, replaceAndRefresh, withLoading, runThenRefresh }}>
      {children}
      {taskCount > 0 && <RouteLoaderOverlay />}
    </NavigationLoadingContext.Provider>
  );
}

export function useNavigationLoading() {
  const ctx = React.useContext(NavigationLoadingContext);
  if (!ctx) throw new Error("useNavigationLoading must be used within NavigationLoadingProvider");
  return ctx;
}
