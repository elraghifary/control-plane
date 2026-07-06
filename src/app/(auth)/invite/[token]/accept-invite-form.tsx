"use client";
import * as React from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import { useNavigationLoading } from "@/components/navigation-loading";
import { Input } from "@/components/ui/input";
import { acceptInvite } from "../actions";

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const { navigate } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const password = String(fd.get("password"));

    const res = await acceptInvite(token, fd);
    if (!res.ok) {
      setError(res.error ?? "Could not accept invite.");
      setPending(false);
      return;
    }

    const signin = await signIn("credentials", { email, password, redirect: false });
    if (signin?.error) {
      setError("Account created, but sign-in failed. Try logging in.");
      setPending(false);
      return;
    }
    navigate("/dashboard");
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <h1 className="text-base font-medium">Set up your account</h1>
        <p className="mt-1 text-xs text-muted-foreground">Invited as <span className="text-foreground">{email}</span></p>
      </div>
      <Input name="password" type="password" placeholder="Password (min 8 chars)" autoComplete="new-password" required />
      <Input name="confirmPassword" type="password" placeholder="Confirm password" autoComplete="new-password" required />
      <Input name="pat" type="password" placeholder="GitHub Personal Access Token" required />
      <p className="text-[11px] text-muted-foreground">The token is encrypted at rest and used only on the server.</p>
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <button type="submit" disabled={pending}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50">
        {pending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {pending ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
