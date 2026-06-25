"use client";
import { Search, Bell } from "lucide-react";
import { signOut } from "next-auth/react";
import type { Repository } from "@/lib/data";
import { ControlPlaneMark } from "@/components/brand/control-plane-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { RepoSelector } from "./repo-selector";

export function TopStrip({ repos, selected, githubLogin }: { repos: Repository[]; selected: string; githubLogin?: string }) {
  const initials = (githubLogin ?? "??").slice(0, 2).toUpperCase();
  return (
    <header className="sticky top-0 z-40 mx-auto flex max-w-[1400px] items-center gap-3 rounded-2xl border border-border bg-card/40 px-3 py-2 backdrop-blur-xl">
      <ControlPlaneMark />
      <div className="leading-tight">
        <div className="text-sm font-medium">Control Plane</div>
        <div className="font-mono text-[10px] tracking-widest text-muted-foreground">OPS TOWER</div>
      </div>
      <div className="mx-1 h-6 w-px bg-border" />
      <RepoSelector repos={repos} selected={selected} />
      <div className="flex-1" />
      <button aria-label="Search" className="flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><Search className="h-4 w-4" /></button>
      <button aria-label="Notifications" className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground"><Bell className="h-4 w-4" /><span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-status-error" /></button>
      <ThemeToggle />
      <button
        onClick={() => signOut({ callbackUrl: "/login" })}
        title={githubLogin ? `Sign out (${githubLogin})` : "Sign out"}
        className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-instrument to-instrument-2 text-xs font-medium text-background transition-opacity hover:opacity-80"
      >
        {initials}
      </button>
    </header>
  );
}
