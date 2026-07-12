"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Environment, EnvMeta } from "@/lib/apps/env-config";
import type { UpdateConfigDTO, IapConfigDTO } from "@/lib/apps/types";
import { WriteGuardProvider } from "./write-guard";
import { ProdBanner } from "./prod-banner";
import { EnvSelector } from "./env-selector";
import { SearchDialog } from "./search-dialog";
import { CompareDialog } from "./compare-dialog";
import { HealthDialog } from "./health-dialog";

type BadgeVariant = "default" | "secondary" | "outline" | "healthy" | "warn" | "error" | "instrument";

interface TabBadge {
  label: string;
  variant: BadgeVariant;
}

export function EnvShell({
  environment,
  environments,
  version,
  auditCount,
  secretCount,
  flagCount,
  updateConfig,
  iapConfig,
  children,
}: {
  environment: Environment;
  environments: (EnvMeta & { configured: boolean })[];
  version: string | null;
  auditCount: number | null;
  secretCount: number | null;
  flagCount: number | null;
  updateConfig: UpdateConfigDTO | null;
  iapConfig: IapConfigDTO | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  const secretsBadges: TabBadge[] = [
    ...(version ? [{ label: `v${version}`, variant: "instrument" as const }] : []),
    ...(secretCount !== null ? [{ label: `${secretCount}`, variant: "secondary" as const }] : []),
  ];

  const flagsBadges: TabBadge[] = flagCount !== null ? [{ label: `${flagCount}`, variant: "secondary" }] : [];

  const updatesBadges: TabBadge[] = updateConfig
    ? [
        { label: updateConfig.isShow ? "ON" : "OFF", variant: updateConfig.isShow ? "instrument" : "secondary" },
        { label: `v${updateConfig.minVersion}`, variant: "secondary" },
      ]
    : [];

  const iapBadges: TabBadge[] = iapConfig
    ? [
        { label: iapConfig.showAndroid ? "Android ON" : "Android OFF", variant: iapConfig.showAndroid ? "instrument" : "secondary" },
        { label: iapConfig.showIos ? "iOS ON" : "iOS OFF", variant: iapConfig.showIos ? "instrument" : "secondary" },
        { label: `${iapConfig.androidProductIds.length + iapConfig.iosProductIds.length}`, variant: "secondary" },
      ]
    : [];

  const auditBadges: TabBadge[] = auditCount !== null ? [{ label: String(auditCount), variant: "secondary" }] : [];

  const tabs: { segment: string; label: string; badges: TabBadge[] }[] = [
    { segment: "secrets", label: "Secrets", badges: secretsBadges },
    { segment: "feature-flags", label: "Feature Flags", badges: flagsBadges },
    { segment: "updates", label: "Updates", badges: updatesBadges },
    { segment: "in-app-purchases", label: "In-App Purchases", badges: iapBadges },
    { segment: "audit-logs", label: "Audit Logs", badges: auditBadges },
  ];

  return (
    <WriteGuardProvider environment={environment}>
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <EnvSelector environments={environments} selected={environment} className="w-full sm:w-auto" />
          <div className="flex items-center gap-2">
            <SearchDialog />
            <CompareDialog />
            <HealthDialog />
          </div>
        </div>

        <ProdBanner />

        <nav className="flex flex-col border-b border-border sm:flex-row sm:items-center">
          {tabs.map((tab) => {
            const href = `/apps/${tab.segment}`;
            const active = pathname.startsWith(href);
            return (
              <Link
                key={tab.segment}
                href={href}
                className={cn(
                  "flex items-center justify-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2 text-sm transition-colors sm:flex-auto",
                  active
                    ? "border-instrument text-instrument"
                    : "border-transparent text-muted-foreground hover:text-foreground",
                )}
              >
                {tab.label}
                {tab.badges.map((badge) => (
                  <Badge key={badge.label} variant={badge.variant} size="sm">{badge.label}</Badge>
                ))}
              </Link>
            );
          })}
        </nav>

        {children}
      </div>
    </WriteGuardProvider>
  );
}
