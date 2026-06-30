export default function ReleasesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Releases</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
