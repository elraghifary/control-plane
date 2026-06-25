import { cn } from "@/lib/utils";

export function ControlPlaneMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={cn("text-instrument", className)} aria-hidden="true">
      <circle cx="20" cy="20" r="17" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      <circle cx="20" cy="20" r="11" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.55" />
      <circle cx="20" cy="20" r="3.2" fill="currentColor" />
      <g className="motion-reduce:hidden [animation:cp-sweep_4s_linear_infinite]" style={{ transformOrigin: "20px 20px" }}>
        <path d="M20 20 L20 3 A17 17 0 0 1 33 11 Z" fill="currentColor" opacity="0.2" />
      </g>
    </svg>
  );
}
