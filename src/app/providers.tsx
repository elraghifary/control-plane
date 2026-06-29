"use client";

import * as React from "react";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { NavigationLoadingProvider } from "@/components/navigation-loading";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false} disableTransitionOnChange>
      <NavigationLoadingProvider>
        {children}
        <Toaster position="top-right" theme="dark" richColors closeButton />
      </NavigationLoadingProvider>
    </ThemeProvider>
  );
}
