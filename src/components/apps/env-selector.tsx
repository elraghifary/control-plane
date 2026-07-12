"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigationLoading } from "@/components/navigation-loading";
import type { Environment, EnvMeta } from "@/lib/apps/env-config";

export function EnvSelector({
  environments,
  selected,
  className,
}: {
  environments: (EnvMeta & { configured: boolean })[];
  selected: Environment;
  className?: string;
}) {
  const { replaceAndRefresh } = useNavigationLoading();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const selectedMeta = environments.find((e) => e.id === selected);

  function choose(env: Environment) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `cp-app-secrets-env=${encodeURIComponent(env)}; path=/; max-age=31536000; samesite=lax`;
    replaceAndRefresh(pathname);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("min-w-48 justify-between border-border bg-card/40 backdrop-blur hover:border-instrument/40", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <KeyRound className="size-4 shrink-0 text-instrument" />
            <span className="truncate">{selectedMeta?.label ?? "Select environment"}</span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandEmpty>No environments found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {environments.map((env) => (
                <CommandItem key={env.id} value={env.id} onSelect={() => choose(env.id)}>
                  <Check className={cn("size-4", env.id === selected ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{env.label}</span>
                  {!env.configured && <span className="text-[10px] text-muted-foreground">not configured</span>}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
