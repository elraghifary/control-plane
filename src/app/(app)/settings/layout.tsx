export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Settings</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
