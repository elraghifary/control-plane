import type { Repository } from "../types";

export const REPOSITORIES: Repository[] = [
  { id: "1", name: "dashboard", slug: "dashboard", enabled: true, defaultBranch: "main" },
  { id: "2", name: "api", slug: "api", enabled: true, defaultBranch: "main" },
  { id: "3", name: "payment", slug: "payment", enabled: true, defaultBranch: "main" },
  { id: "4", name: "notification", slug: "notification", enabled: true, defaultBranch: "main" },
  { id: "5", name: "users", slug: "users", enabled: true, defaultBranch: "main" },
  { id: "6", name: "inventory", slug: "inventory", enabled: false, defaultBranch: "main" },
];
