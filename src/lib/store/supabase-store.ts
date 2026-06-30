import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import type { Store, User, NewUser } from "./store";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key, { auth: { persistSession: false } });
}

function toUser(row: Record<string, string>): User {
  return {
    id: row.id,
    username: row.username,
    passwordHash: row.password_hash,
    patEncrypted: row.pat_encrypted,
    githubLogin: row.github_login,
    avatarUrl: row.avatar_url ?? undefined,
    createdAt: row.created_at,
  };
}

export class SupabaseStore implements Store {
  async getUserByUsername(username: string): Promise<User | null> {
    const { data, error } = await getClient()
      .from("users")
      .select("*")
      .eq("username", username.toLowerCase())
      .maybeSingle();
    if (error) throw error;
    return data ? toUser(data) : null;
  }

  async getUserById(id: string): Promise<User | null> {
    const { data, error } = await getClient()
      .from("users")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toUser(data) : null;
  }

  async createUser(input: NewUser): Promise<User> {
    const username = input.username.toLowerCase();
    const { data, error } = await getClient()
      .from("users")
      .insert({
        id: randomUUID(),
        username,
        password_hash: input.passwordHash,
        pat_encrypted: input.patEncrypted,
        github_login: input.githubLogin,
        avatar_url: input.avatarUrl ?? null,
        created_at: new Date().toISOString(),
      })
      .select("*")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("Username already exists");
      throw error;
    }
    return toUser(data);
  }

  async updateUserPat(id: string, patEncrypted: string): Promise<void> {
    const { error } = await getClient()
      .from("users")
      .update({ pat_encrypted: patEncrypted })
      .eq("id", id);
    if (error) throw error;
  }

  async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    const { error } = await getClient()
      .from("users")
      .update({ password_hash: passwordHash })
      .eq("id", id);
    if (error) throw error;
  }
}
