"use client";

import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SprintCombobox } from "@/components/clickup/comboboxes";
import { listManifestSprintsAction, checkManifestSprintExistsAction, createManifestAction } from "@/app/(app)/manifests/actions";
import type { ClickUpSprint, ClickUpManifestPage } from "@/lib/clickup/types";

const fieldLabelCls = "mb-3 block text-xs font-medium uppercase tracking-wide text-muted-foreground";

const createManifestSchema = z.object({
  sprintName: z.string().min(1, "Sprint is required"),
});

type CreateManifestValues = z.infer<typeof createManifestSchema>;

export function CreateManifestDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [sprints, setSprints] = React.useState<ClickUpSprint[]>([]);
  const [sprintsLoading, setSprintsLoading] = React.useState(false);
  const [sprintsError, setSprintsError] = React.useState<string | null>(null);
  const [selectedSprint, setSelectedSprint] = React.useState<ClickUpSprint | null>(null);
  const [existingPage, setExistingPage] = React.useState<ClickUpManifestPage | null>(null);
  const [checkingExisting, setCheckingExisting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const {
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CreateManifestValues>({ resolver: zodResolver(createManifestSchema), defaultValues: { sprintName: "" } });

  function handleOpen() {
    setSelectedSprint(null);
    setExistingPage(null);
    setError(null);
    reset({ sprintName: "" });
    setOpen(true);

    setSprintsLoading(true);
    setSprintsError(null);
    listManifestSprintsAction().then((res) => {
      setSprintsLoading(false);
      if (!res.ok) { setSprintsError(res.error ?? "Could not load sprints"); return; }
      setSprints(res.sprints);
    });
  }

  async function selectSprint(sprint: ClickUpSprint) {
    setSelectedSprint(sprint);
    setValue("sprintName", sprint.name, { shouldValidate: true });
    setExistingPage(null);
    setCheckingExisting(true);
    const res = await checkManifestSprintExistsAction(sprint.name);
    setCheckingExisting(false);
    if (res.ok) setExistingPage(res.existingPage ?? null);
  }

  async function submit(values: CreateManifestValues) {
    setError(null);
    const res = await createManifestAction(values.sprintName);
    if (!res.ok) {
      setError(res.error ?? "Could not create manifest doc");
      return;
    }
    router.refresh();
    setOpen(false);
  }

  return (
    <>
      <Button size="sm" onClick={handleOpen}>Create Manifest</Button>

      <Dialog open={open} onOpenChange={(next) => { if (!next && !isSubmitting) setOpen(false); }}>
        <DialogContent className="flex max-w-md flex-col gap-0 p-0">
          <DialogHeader className="shrink-0 border-b border-border px-5 py-4">
            <DialogTitle className="text-base">Create Manifest</DialogTitle>
          </DialogHeader>

          <div className="px-5 py-5">
            <label className={fieldLabelCls}>Sprint</label>
            <SprintCombobox sprints={sprints} value={selectedSprint} onChange={selectSprint} loading={sprintsLoading} error={sprintsError} />
            {errors.sprintName && <p className="mt-1.5 text-xs text-status-error">{errors.sprintName.message}</p>}
            {checkingExisting && <p className="mt-2 text-xs text-muted-foreground">Checking for an existing manifest…</p>}
            {existingPage && (
              <p className="mt-2 text-xs text-status-warn">
                A manifest for this sprint already exists —{" "}
                <a href={existingPage.htmlUrl} target="_blank" rel="noreferrer" className="underline hover:text-foreground">
                  view on ClickUp
                </a>
                , or use Edit from the list to update it.
              </p>
            )}
            {error && <p className="mt-2 text-xs text-status-error">{error}</p>}
          </div>

          <div className="flex shrink-0 justify-end gap-2 border-t border-border px-5 py-4">
            <Button type="button" variant="outline" size="sm" disabled={isSubmitting} onClick={() => setOpen(false)}>Cancel</Button>
            <Button size="sm" disabled={!!existingPage} loading={isSubmitting} onClick={handleSubmit(submit)}>
              {isSubmitting ? "Creating…" : "Create"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
