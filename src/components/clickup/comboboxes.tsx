"use client";

import * as React from "react";
import { Fragment } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import type { Repository } from "@/lib/data/types";
import { groupRepositories } from "@/components/shell/repository-selector";
import type { ClickUpSprint } from "@/lib/clickup/types";

function sprintSortKey(name: string): number {
  const match = name.match(/(\d+)/);
  return match ? parseInt(match[1], 10) : -1;
}

function sortSprintsLatestFirst(sprints: ClickUpSprint[]): ClickUpSprint[] {
  return [...sprints].sort((a, b) => sprintSortKey(b.name) - sprintSortKey(a.name));
}

export function SprintCombobox({
  sprints,
  value,
  onChange,
  loading,
  error,
}: {
  sprints: ClickUpSprint[];
  value: ClickUpSprint | null;
  onChange: (sprint: ClickUpSprint) => void;
  loading: boolean;
  error: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const sorted = sortSprintsLatestFirst(sprints);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={loading}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40 disabled:opacity-50"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}>
            {loading ? "Loading sprints…" : value?.name || "Select sprint"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandEmpty>{error ?? "No sprints found."}</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {sorted.map((s) => (
                <CommandItem key={s.id} value={s.name} onSelect={() => { onChange(s); setOpen(false); }}>
                  <Check className={cn("size-4", s.id === value?.id ? "opacity-100" : "opacity-0")} />
                  {s.name}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function RepoCombobox({
  repositories,
  value,
  onChange,
}: {
  repositories: Repository[];
  value: string;
  onChange: (repo: Repository) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const groups = groupRepositories(repositories);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !value && "text-muted-foreground")}>
            {value || "Select repository"}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandInput placeholder="Search…" />
          <CommandEmpty>No repositories found.</CommandEmpty>
          <CommandList>
            {groups.map((group, i) => (
              <Fragment key={group.label}>
                {i > 0 && <CommandSeparator />}
                <CommandGroup heading={group.label}>
                  {group.repos.map((repo) => (
                    <CommandItem key={repo.slug} value={repo.slug} onSelect={() => { onChange(repo); setOpen(false); }}>
                      <Check className={cn("size-4", repo.slug === value ? "opacity-100" : "opacity-0")} />
                      {repo.slug}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </Fragment>
            ))}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function OptionCombobox({
  options,
  value,
  onChange,
  disabled,
  loading,
  placeholder = "Select…",
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  loading?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const current = options.find((o) => o.value === value);

  return (
    <Popover modal open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-border bg-card/40 px-3 py-2 text-sm transition-colors hover:border-instrument/40 disabled:opacity-50"
        >
          <span className={cn("min-w-0 flex-1 truncate text-left", !current && "text-muted-foreground")}>
            {loading ? "Loading…" : (current?.label ?? placeholder)}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((o) => (
                <CommandItem key={o.value} value={o.label} onSelect={() => { onChange(o.value); setOpen(false); }}>
                  <Check className={cn("size-4", o.value === value ? "opacity-100" : "opacity-0")} />
                  {o.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
