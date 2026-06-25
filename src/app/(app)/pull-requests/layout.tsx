"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { label: "Development", href: "/pull-requests/development" },
  { label: "Staging", href: "/pull-requests/staging" },
];

export default function PullRequestsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div>
      <h1 className="text-lg font-medium">Pull Requests</h1>
      <div className="mt-3 inline-flex rounded-lg border border-border bg-card/40 p-1 backdrop-blur">
        {TABS.map((t) => (
          <Link key={t.href} href={t.href}
            className={cn("rounded-md px-3 py-1.5 text-sm transition-colors", pathname === t.href ? "bg-instrument/15 text-instrument" : "text-muted-foreground hover:text-foreground")}>
            {t.label}
          </Link>
        ))}
      </div>
      <div className="mt-5">{children}</div>
    </div>
  );
}
