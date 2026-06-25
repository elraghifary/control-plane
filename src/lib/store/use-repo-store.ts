import { create } from "zustand";
import { persist } from "zustand/middleware";

interface RepoState {
  selectedRepo: string;
  setSelectedRepo: (slug: string) => void;
}

export const useRepoStore = create<RepoState>()(
  persist(
    (set) => ({
      selectedRepo: "dashboard",
      setSelectedRepo: (slug) => set({ selectedRepo: slug }),
    }),
    { name: "cp-selected-repo" }
  )
);
