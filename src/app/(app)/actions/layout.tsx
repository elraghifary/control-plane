export default function ActionsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Actions</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
