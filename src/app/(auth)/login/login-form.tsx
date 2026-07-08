"use client";
import * as React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import { useNavigationLoading } from "@/components/navigation-loading";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const { navigate } = useNavigationLoading();
  const [error, setError] = React.useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginValues) {
    setError(null);
    const res = await signIn("credentials", { ...values, redirect: false });
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }
    navigate("/dashboard");
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <h1 className="text-base font-medium">Sign In</h1>
      <div>
        <Input type="email" placeholder="Email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-[12px] text-status-error">{errors.email.message}</p>}
      </div>
      <div>
        <Input type="password" placeholder="Password" autoComplete="current-password" {...register("password")} />
        {errors.password && <p className="mt-1 text-[12px] text-status-error">{errors.password.message}</p>}
      </div>
      {error && <p className="text-[12px] text-status-error">{error}</p>}
      <Button type="submit" loading={isSubmitting} className="w-full">
        {isSubmitting ? "Signing In…" : "Sign In"}
      </Button>
      <p className="text-center text-[12px] text-muted-foreground">
        Need access? Ask an admin to invite you.
      </p>
    </form>
  );
}
