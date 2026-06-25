import { EmptyState } from "@/components/states/empty-state";
export default function Page() {
  return (
    <div>
      <h1 className="text-lg font-medium">Settings</h1>
      <div className="mt-5">
        <EmptyState title="Settings" description="GitHub token and repository management arrive in a later phase." />
      </div>
    </div>
  );
}
