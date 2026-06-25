import { cn } from "@/lib/utils";

export function HudCorners({ className }: { className?: string }) {
  const corner = "absolute w-3 h-3 border-instrument/40";
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0", className)}>
      <span className={cn(corner, "left-0 top-0 border-l border-t rounded-tl")} />
      <span className={cn(corner, "right-0 top-0 border-r border-t rounded-tr")} />
      <span className={cn(corner, "bottom-0 left-0 border-b border-l rounded-bl")} />
      <span className={cn(corner, "bottom-0 right-0 border-b border-r rounded-br")} />
    </div>
  );
}
