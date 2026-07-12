import { Badge } from "@/components/ui/badge";
import type { CellStatus } from "@/lib/apps/compare";

const LABEL: Record<CellStatus, string> = { present: "✓", empty: "O", missing: "✗", na: "—" };
const VARIANT: Record<CellStatus, "healthy" | "warn" | "error" | "secondary"> = {
  present: "healthy",
  empty: "warn",
  missing: "error",
  na: "secondary",
};

export function CellStatusBadge({ status }: { status: CellStatus }) {
  return <Badge variant={VARIANT[status]} size="sm">{LABEL[status]}</Badge>;
}
