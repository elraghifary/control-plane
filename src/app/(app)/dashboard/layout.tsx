export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Dashboard</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
