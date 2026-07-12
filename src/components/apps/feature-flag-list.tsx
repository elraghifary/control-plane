"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { FeatureFlagRow } from "./feature-flag-row";
import { FeatureFlagFormDialog } from "./feature-flag-form-dialog";
import { ConfirmDeleteFlagDialog } from "./confirm-delete-flag-dialog";
import { useWriteGuard } from "./write-guard";
import { EmptyState } from "@/components/states/empty-state";
import type { Environment } from "@/lib/apps/env-config";
import type { FeatureFlagDTO } from "@/lib/apps/types";

export function FeatureFlagList({
  environment,
  initialFlags,
}: {
  environment: Environment;
  initialFlags: FeatureFlagDTO[];
}) {
  const { writesAllowed } = useWriteGuard();
  const [formOpen, setFormOpen] = React.useState(false);
  const [deletingFlag, setDeletingFlag] = React.useState<FeatureFlagDTO | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" disabled={!writesAllowed} onClick={() => setFormOpen(true)}>Add Flag</Button>
      </div>

      {initialFlags.length === 0 ? (
        <EmptyState title="No feature flags yet" description="Add the first feature flag for this environment." />
      ) : (
        <div className="space-y-2">
          {initialFlags.map((flag) => (
            <FeatureFlagRow key={flag.id} environment={environment} flag={flag} onDelete={setDeletingFlag} />
          ))}
        </div>
      )}

      <FeatureFlagFormDialog environment={environment} open={formOpen} onOpenChange={setFormOpen} />
      <ConfirmDeleteFlagDialog
        environment={environment}
        flag={deletingFlag}
        open={!!deletingFlag}
        onOpenChange={(next) => { if (!next) setDeletingFlag(null); }}
      />
    </div>
  );
}
