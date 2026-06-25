import { JsonFileStore } from "./json-file-store";
import type { Store } from "./store";

export const store: Store = new JsonFileStore();
export type { User, NewUser, Store } from "./store";
