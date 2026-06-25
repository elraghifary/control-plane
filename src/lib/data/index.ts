import { MockDataService } from "./mock-data-service";
import type { DataService } from "./data-service";

export const data: DataService = new MockDataService();
export * from "./types";
export { REPOS } from "./fixtures/repos";
