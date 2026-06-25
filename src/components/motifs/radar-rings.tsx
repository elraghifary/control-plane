"use client";
import { cn } from "@/lib/utils";

export function RadarRings({ size = 64, className, sweep = true }: { size?: number; className?: string; sweep?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 80 80" className={cn("text-instrument", className)} aria-hidden="true">
      <circle cx="40" cy="40" r="30" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.25" />
      <circle cx="40" cy="40" r="19" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {sweep && (
        <g className="origin-center motion-reduce:hidden [animation:cp-sweep_4s_linear_infinite]" style={{ transformOrigin: "40px 40px" }}>
          <path d="M40 40 L40 8 A32 32 0 0 1 64 22 Z" fill="currentColor" opacity="0.2" />
        </g>
      )}
      <circle cx="40" cy="40" r="2.5" fill="currentColor" />
    </svg>
  );
}
