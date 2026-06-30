import { SupabaseStore } from "./supabase-store";
import type { Store } from "./store";

export const store: Store = new SupabaseStore();
export type { User, NewUser, Store } from "./store";
