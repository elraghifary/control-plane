"use client";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, GitPullRequest, Tag, Settings } from "lucide-react";
import { GlassDock, type DockItem } from "@/components/ui/glass-dock";

const ROUTES = ["/dashboard", "/pull-requests", "/releases", "/settings"];

export function GlassDockNav() {
  const pathname = usePathname();
  const router = useRouter();
  const activeIndex = ROUTES.findIndex((r) => pathname.startsWith(r));

  const items: DockItem[] = [
    { title: "Dashboard", icon: LayoutDashboard, onClick: () => router.push("/dashboard") },
    { title: "Pull Requests", icon: GitPullRequest, onClick: () => router.push("/pull-requests") },
    { title: "Releases", icon: Tag, onClick: () => router.push("/releases") },
    { title: "Settings", icon: Settings, onClick: () => router.push("/settings") },
  ];

  return (
    <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2">
      <GlassDock items={items} activeIndex={activeIndex === -1 ? undefined : activeIndex} />
    </div>
  );
}
