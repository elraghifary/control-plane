import { EmptyState } from "@/components/states/empty-state";
export default function Page() {
  return (
    <div>
      <h1 className="text-lg font-medium">Releases</h1>
      <div className="mt-5">
        <EmptyState title="No releases yet" description="Published releases will appear here in a later phase." />
      </div>
    </div>
  );
}
