"use client";
import { useState, useEffect, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, GitPullRequest, Tag, Settings, LogOut, Menu, X, MessagesSquare, PlayCircle, FileCheck2 } from "lucide-react";
import { signOut } from "next-auth/react";
import { ControlPlaneMark } from "@/components/brand/control-plane-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

const ROUTES = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
  { href: "/releases", label: "Releases", icon: Tag },
  { href: "/sign-offs", label: "Sign-offs", icon: FileCheck2 },
  { href: "/actions", label: "Actions", icon: PlayCircle },
  { href: "/clickup/pull-requests", label: "ClickUp Pull Requests", icon: MessagesSquare },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function TopStrip({ githubLogin }: { githubLogin?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const initials = (githubLogin ?? "??").slice(0, 2).toUpperCase();

  useEffect(() => { startTransition(() => setMobileNavOpen(false)); }, [pathname]);

  return (
    <div className="fixed inset-x-0 top-0 z-40">
      <header className="mx-auto flex max-w-[1400px] items-center gap-2 border-b border-border bg-card/40 px-3 pb-2 pt-3 backdrop-blur-xl sm:gap-3 sm:rounded-2xl sm:border">
        {/* Burger — mobile only */}
        <button
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground md:hidden"
          onClick={() => setMobileNavOpen((v) => !v)}
          aria-label="Toggle navigation"
          aria-expanded={mobileNavOpen}
        >
          {mobileNavOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
        </button>

        <ControlPlaneMark />
        <div className="leading-tight">
          <div className="text-sm font-medium">Control Plane</div>
        </div>
        <div className="mx-1 hidden h-6 w-px bg-border md:block" />

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {ROUTES.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                pathname.startsWith(href)
                  ? "bg-instrument/15 text-instrument"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        <ThemeToggle />

        {/* Avatar dropdown */}
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            title={githubLogin ?? undefined}
            aria-label="User menu"
            aria-expanded={menuOpen}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-instrument to-instrument-2 text-xs font-medium text-background transition-opacity hover:opacity-80"
          >
            {initials}
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full z-50 mt-1.5 min-w-[160px] rounded-xl border border-border bg-card/90 p-1 shadow-lg backdrop-blur-xl">
                {githubLogin && (
                  <div className="px-3 py-1.5 text-xs text-muted-foreground">{githubLogin}</div>
                )}
                <button
                  onClick={() => { setMenuOpen(false); signOut({ callbackUrl: "/login" }); }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-status-error/10 hover:text-status-error"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {/* Mobile nav drawer */}
      {mobileNavOpen && (
        <div className="border-b border-border bg-card/95 backdrop-blur-xl md:hidden">
          <div className="mx-auto flex max-w-[1400px] flex-col gap-1 p-3">
            {ROUTES.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  pathname.startsWith(href)
                    ? "bg-instrument/15 text-instrument"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
