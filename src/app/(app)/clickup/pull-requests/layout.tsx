export default function ClickUpPullRequestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">ClickUp Pull Requests</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
