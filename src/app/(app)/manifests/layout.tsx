export default function ManifestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Manifests</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
