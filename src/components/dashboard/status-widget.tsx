import { RadarRings } from "@/components/motifs/radar-rings";
import { RunwayStripes } from "@/components/motifs/runway-stripes";
import type { EnvironmentStatus } from "@/lib/data";
import { cn } from "@/lib/utils";

const TONE: Record<EnvironmentStatus["status"], { text: string; label: string }> = {
  healthy: { text: "text-status-healthy", label: "Healthy" },
  deploying: { text: "text-status-warn", label: "Deploying" },
  stable: { text: "text-instrument", label: "Stable" },
  degraded: { text: "text-status-error", label: "Degraded" },
};

export function StatusWidget({ status }: { status: EnvironmentStatus }) {
  const tone = TONE[status.status];
  const title = status.env === "main" ? "Main" : status.env[0].toUpperCase() + status.env.slice(1);
  return (
    <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-xl">
      <RunwayStripes className={cn("absolute -bottom-3.5 -right-3.5", tone.text)} />
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{title}</span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px]", tone.text, "border-current/30 bg-current/10")}>{tone.label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <span className={tone.text}><RadarRings size={44} /></span>
        <div>
          <div className="font-mono text-base font-medium">{status.env === "main" ? status.marker : status.openPRs}</div>
          <div className="text-[10px] text-muted-foreground">{status.env === "main" ? "current tag" : "open PRs"}</div>
        </div>
      </div>
      <div className="mt-1.5 font-mono text-[10px] text-muted-foreground">
        {status.progressPct ? `deploy in progress · ${status.progressPct}%` : `marker · ${status.marker}`}
      </div>
    </div>
  );
}
