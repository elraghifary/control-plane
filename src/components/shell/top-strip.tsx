"use client";
import { useState, useEffect, useRef, startTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutDashboard, GitPullRequest, Tag, Settings, LogOut, Menu, X, MessagesSquare, PlayCircle, FileCheck2, FileStack, KeyRound } from "lucide-react";
import { signOut } from "next-auth/react";
import { ControlPlaneMark } from "@/components/brand/control-plane-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

type NavIcon = typeof LayoutDashboard;
type NavLink = { kind: "link"; href: string; label: string; icon: NavIcon };
type NavGroup = { kind: "group"; label: string; icon: NavIcon; items: { href: string; label: string; icon: NavIcon }[] };

const NAV_ITEMS: (NavLink | NavGroup)[] = [
  { kind: "link", href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    kind: "group",
    label: "Git",
    icon: GitPullRequest,
    items: [
      { href: "/clickup/pull-requests", label: "ClickUp Pull Requests", icon: MessagesSquare },
      { href: "/pull-requests", label: "Pull Requests", icon: GitPullRequest },
      { href: "/actions", label: "Actions", icon: PlayCircle },
      { href: "/releases", label: "Releases", icon: Tag },
    ],
  },
  {
    kind: "group",
    label: "Deployment",
    icon: FileStack,
    items: [
      { href: "/manifests", label: "Manifests", icon: FileStack },
      { href: "/sign-offs", label: "Sign-offs", icon: FileCheck2 },
    ],
  },
  { kind: "link", href: "/apps", label: "Apps", icon: KeyRound },
  { kind: "link", href: "/settings", label: "Settings", icon: Settings },
];

function NavGroupDropdown({ group, pathname }: { group: NavGroup; pathname: string }) {
  const [open, setOpen] = useState(false);
  const active = group.items.some((item) => pathname.startsWith(item.href));
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function cancelClose() {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  }

  function openNow() {
    cancelClose();
    setOpen(true);
  }

  function scheduleClose() {
    cancelClose();
    closeTimer.current = setTimeout(() => {
      setOpen(false);
      triggerRef.current?.blur();
    }, 150);
  }

  useEffect(() => cancelClose, []);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          ref={triggerRef}
          onMouseEnter={openNow}
          onMouseLeave={scheduleClose}
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors focus:outline-none focus-visible:outline-none",
            active ? "bg-instrument/15 text-instrument" : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <group.icon className="h-3.5 w-3.5" />
          {group.label}
          <ChevronDown className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-56 p-1"
        onMouseEnter={openNow}
        onMouseLeave={scheduleClose}
        onCloseAutoFocus={(e) => e.preventDefault()}
      >
        {group.items.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => { cancelClose(); setOpen(false); triggerRef.current?.blur(); }}
            className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors",
              pathname.startsWith(href)
                ? "bg-instrument/15 text-instrument"
                : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function TopStrip({ githubLogin }: { githubLogin?: string }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const initials = (githubLogin ?? "??").slice(0, 2).toUpperCase();

  useEffect(() => { startTransition(() => setMobileNavOpen(false)); }, [pathname]);

  return (
    <div className="fixed inset-x-0 top-0 z-40">
      <header className="mx-auto flex max-w-5xl items-center gap-2 border-b border-border bg-card/40 px-8 pb-2 pt-3 backdrop-blur-xl sm:gap-3 sm:rounded-b-2xl sm:border">
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

        {/* Desktop nav links */}
        <nav className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map((item) =>
            item.kind === "link" ? (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors",
                  pathname.startsWith(item.href)
                    ? "bg-instrument/15 text-instrument"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                )}
              >
                <item.icon className="h-3.5 w-3.5" />
                {item.label}
              </Link>
            ) : (
              <NavGroupDropdown key={item.label} group={item} pathname={pathname} />
            )
          )}
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
          <div className="mx-auto flex max-w-5xl flex-col gap-1 px-8 py-3">
            {NAV_ITEMS.map((item) =>
              item.kind === "link" ? (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                    pathname.startsWith(item.href)
                      ? "bg-instrument/15 text-instrument"
                      : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              ) : (
                <div key={item.label} className="mt-2 first:mt-0">
                  <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground/70">{item.label}</p>
                  {item.items.map(({ href, label, icon: Icon }) => (
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
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
