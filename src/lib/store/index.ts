import { PgStore } from "./pg-store";
import type { Store } from "./store";

export const store: Store = new PgStore();
export type { User, NewUser, Store } from "./store";
