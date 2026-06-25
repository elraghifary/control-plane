import { RadarRings } from "@/components/motifs/radar-rings";

export function ErrorState({ title, description, action }: { title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-status-error/40 px-6 py-16 text-center">
      <div className="opacity-70 text-status-error"><RadarRings size={96} /></div>
      <h3 className="mt-4 text-base font-medium text-status-error">{title}</h3>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
