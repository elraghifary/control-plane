"use client";
import * as React from "react";
import { Folder, ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { REPOS } from "@/lib/data";
import { useRepoStore } from "@/lib/store/use-repo-store";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";

export function RepoSelector() {
  const { selectedRepo, setSelectedRepo } = useRepoStore();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-sm text-foreground/80 backdrop-blur transition-colors hover:border-instrument/40"
      >
        <Folder className="h-4 w-4 text-instrument" />
        <span className="text-muted-foreground">Repository</span>
        <span className="font-mono font-medium text-foreground">{selectedRepo}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-2 w-48 overflow-hidden rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {REPOS.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => { setSelectedRepo(r.slug); setOpen(false); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-accent",
                    !r.enabled && "opacity-40"
                  )}
                >
                  <span className="font-mono">{r.name}</span>
                  {r.slug === selectedRepo && <Check className="h-3.5 w-3.5 text-instrument" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
