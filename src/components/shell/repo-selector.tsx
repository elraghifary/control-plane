"use client";
import * as React from "react";
import { useRouter } from "next/navigation";
import { Folder, ChevronDown, Check } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import type { Repository } from "@/lib/data";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { cn } from "@/lib/utils";

export function RepoSelector({ repos, selected }: { repos: Repository[]; selected: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useOutsideClick(ref, () => setOpen(false));

  const current = repos.find((r) => r.slug === selected)?.name ?? "Select repo";

  function choose(slug: string) {
    document.cookie = `cp-repo=${encodeURIComponent(slug)}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.refresh();
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-lg border border-border bg-card/40 px-3 py-1.5 text-sm text-foreground/80 backdrop-blur transition-colors hover:border-instrument/40"
      >
        <Folder className="h-4 w-4 text-instrument" />
        <span className="text-muted-foreground">Repository</span>
        <span className="font-mono font-medium text-foreground">{current}</span>
        <ChevronDown className="h-3.5 w-3.5 opacity-60" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="absolute z-50 mt-2 max-h-72 w-64 overflow-auto rounded-lg border border-border bg-popover p-1 shadow-xl"
          >
            {repos.length === 0 && (
              <li className="px-2.5 py-2 text-xs text-muted-foreground">No repositories found for this token.</li>
            )}
            {repos.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => choose(r.slug)}
                  className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-sm hover:bg-accent"
                >
                  <span className="font-mono">{r.slug}</span>
                  {r.slug === selected && <Check className="h-3.5 w-3.5 text-instrument" />}
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
