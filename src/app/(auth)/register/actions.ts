"use server";
import { store } from "@/lib/store";
import { hashPassword, encryptPat } from "@/lib/auth/crypto";
import { validatePat } from "@/lib/github/validate-pat";

export interface RegisterResult {
  ok: boolean;
  error?: string;
}

export async function registerUser(formData: FormData): Promise<RegisterResult> {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const pat = String(formData.get("pat") ?? "").trim();

  if (!username || !password || !pat) return { ok: false, error: "All fields are required." };
  if (!/^[a-z0-9_-]{2,32}$/.test(username)) return { ok: false, error: "Username must be 2–32 chars: letters, numbers, hyphen, underscore." };
  if (password.length < 8) return { ok: false, error: "Password must be at least 8 characters." };

  const identity = await validatePat(pat);
  if (!identity) return { ok: false, error: "That GitHub token is invalid or lacks access." };

  try {
    await store.createUser({
      username,
      passwordHash: hashPassword(password),
      patEncrypted: encryptPat(pat),
      githubLogin: identity.login,
      avatarUrl: identity.avatarUrl,
    });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Could not create account." };
  }
}
