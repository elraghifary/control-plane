"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { Check, ChevronsUpDown, Folder } from "lucide-react";
import type { Repository } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNavigationLoading } from "@/components/navigation-loading";

export function RepositorySelector({ repositories, selected, className }: { repositories: Repository[]; selected: string; className?: string }) {
  const { replaceAndRefresh } = useNavigationLoading();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function choose(slug: string) {
    // eslint-disable-next-line react-hooks/immutability
    document.cookie = `cp-repository=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
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
          className={cn("min-w-56 justify-between border-border bg-card/40 font-mono text-xs backdrop-blur hover:border-instrument/40", className)}
        >
          <span className="flex min-w-0 items-center gap-2">
            <Folder className="size-4 shrink-0 text-instrument" />
            <span className="truncate">{selected || "Select repository"}</span>
          </span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search repository..." />
          <CommandEmpty>No repositories found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {repositories.map((repository) => (
                <CommandItem
                  key={repository.slug}
                  value={repository.slug}
                  onSelect={() => choose(repository.slug)}
                  className="font-mono text-xs"
                >
                  <Check className={cn("mr-2 size-4", repository.slug === selected ? "opacity-100" : "opacity-0")} />
                  {repository.slug}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
