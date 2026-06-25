import type { LucideIcon } from "lucide-react";
import { AnimatedCounter } from "@/components/motion/animated-counter";
import { HudCorners } from "@/components/motifs/hud-corners";
import { cn } from "@/lib/utils";

export function MetricCard({ label, value, suffix, delta, deltaTone = "muted", icon: Icon, footer }: {
  label: string; value?: number; suffix?: string; delta?: string;
  deltaTone?: "healthy" | "warn" | "muted"; icon: LucideIcon; footer?: React.ReactNode;
}) {
  const tone = { healthy: "text-status-healthy", warn: "text-status-warn", muted: "text-muted-foreground" }[deltaTone];
  return (
    <div className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-xl transition-transform duration-200 hover:-translate-y-1 hover:border-instrument/40">
      <HudCorners className="opacity-0 transition-opacity group-hover:opacity-100" />
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className="h-4 w-4 text-instrument" />
      </div>
      {value !== undefined && (
        <div className="mt-2 text-2xl font-medium">
          <AnimatedCounter value={value} suffix={suffix} />
        </div>
      )}
      {footer ?? (delta && <div className={cn("mt-1 text-[11px]", tone)}>{delta}</div>)}
    </div>
  );
}
