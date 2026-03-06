import { create } from "zustand";
import type { User } from "firebase/auth";

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthStore {
  /** Firebase user object, or null when signed out. */
  user: User | null;
  /** Tri-state: loading → firebase hasn't resolved yet; then authenticated/unauthenticated. */
  status: AuthStatus;
  /** Controls the global sign-in / sign-up modal. */
  isAuthModalOpen: boolean;

  setUser: (user: User | null) => void;
  openAuthModal: () => void;
  closeAuthModal: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  status: "loading",
  isAuthModalOpen: false,

  setUser: (user) =>
    set({
      user,
      status: user ? "authenticated" : "unauthenticated",
    }),

  openAuthModal: () => set({ isAuthModalOpen: true }),
  closeAuthModal: () => set({ isAuthModalOpen: false }),
}));
