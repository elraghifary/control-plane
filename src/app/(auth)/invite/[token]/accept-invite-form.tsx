"use client";
import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useNavigationLoading } from "@/components/navigation-loading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { acceptInvite } from "../actions";

const acceptInviteSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Confirm your password"),
    pat: z.string().min(1, "GitHub Personal Access Token is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type AcceptInviteValues = z.infer<typeof acceptInviteSchema>;

export function AcceptInviteForm({ token, email }: { token: string; email: string }) {
  const { navigate } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AcceptInviteValues>({ resolver: zodResolver(acceptInviteSchema) });

  async function onSubmit(values: AcceptInviteValues) {
    setError(null);
    const fd = new FormData();
    fd.set("password", values.password);
    fd.set("confirmPassword", values.confirmPassword);
    fd.set("pat", values.pat);

    const res = await acceptInvite(token, fd);
    if (!res.ok) {
      setError(res.error ?? "Could not accept invite.");
      return;
    }

    const signin = await signIn("credentials", { email, password: values.password, redirect: false });
    if (signin?.error) {
      setError("Account created, but sign-in failed. Try logging in.");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <h1 className="text-base font-medium">Set Up Your Account</h1>
        <p className="mt-1 text-xs text-muted-foreground">Invited as <span className="text-foreground">{email}</span></p>
      </div>
      <div>
        <Input type="password" placeholder="Password (min 8 chars)" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="mt-1 text-[12px] text-status-error">{errors.password.message}</p>}
      </div>
      <div>
        <Input type="password" placeholder="Confirm password" autoComplete="new-password" {...register("confirmPassword")} />
        {errors.confirmPassword && <p className="mt-1 text-[12px] text-status-error">{errors.confirmPassword.message}</p>}
      </div>
      <div>
        <Input type="password" placeholder="GitHub Personal Access Token" {...register("pat")} />
        {errors.pat && <p className="mt-1 text-[12px] text-status-error">{errors.pat.message}</p>}
      </div>
      <p className="text-[11px] text-muted-foreground">The token is encrypted at rest and used only on the server.</p>
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <Button type="submit" loading={isSubmitting} className="w-full">
        {isSubmitting ? "Creating Account…" : "Create Account"}
      </Button>
    </form>
  );
}
