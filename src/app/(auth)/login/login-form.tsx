"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useNavigationLoading } from "@/components/navigation-loading";
import { Input } from "@/components/ui/input";

export function LoginForm() {
  const { navigate } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const res = await signIn("credentials", {
      email: String(fd.get("email")),
      password: String(fd.get("password")),
      redirect: false,
    });
    if (res?.error) {
      setError("Invalid email or password.");
      setPending(false);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h1 className="text-base font-medium">Sign in</h1>
      <Input name="email" type="email" placeholder="Email" autoComplete="email" required />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" required />
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit" disabled={pending}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>
      <p className="text-center text-[12px] text-muted-foreground">
        Need access? Ask an admin to invite you.
      </p>
    </form>
  );
}
