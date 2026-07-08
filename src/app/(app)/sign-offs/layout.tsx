export default function SignoffsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <h1 className="text-lg font-medium">Sign-offs</h1>
      <div className="mt-5">{children}</div>
    </div>
  );
}
