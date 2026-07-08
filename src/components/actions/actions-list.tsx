import type { WorkflowRunGroup } from "@/lib/data/types";
import { WorkflowRunGroupCard } from "./workflow-run-group-card";

export function ActionsList({ slug, groups }: { slug: string; groups: WorkflowRunGroup[] }) {
  return (
    <div className="space-y-3">
      {groups.map((group) => (
        <WorkflowRunGroupCard key={group.key} slug={slug} group={group} />
      ))}
    </div>
  );
}
