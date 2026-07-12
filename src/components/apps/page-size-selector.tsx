"use client";

import { useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function PageSizeSelector({
  options,
  selected,
  onChange,
  className,
}: {
  options: number[];
  selected: number;
  onChange: (size: number) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  function choose(size: number) {
    onChange(size);
    setOpen(false);
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-fit shrink-0 justify-between border-border bg-card/40 backdrop-blur hover:border-instrument/40", className)}
        >
          <span className="truncate">{selected} / page</span>
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandEmpty>No options found.</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((size) => (
                <CommandItem key={size} value={String(size)} onSelect={() => choose(size)}>
                  <Check className={cn("size-4", size === selected ? "opacity-100" : "opacity-0")} />
                  <span className="flex-1">{size} / page</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
