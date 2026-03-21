"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";

/**
 * Global auth listener mounted once at app root.
 * Keeps auth state in sync on every route, not just the home page.
 */
export function AuthBootstrap() {
  const setUser = useAuthStore((s) => s.setUser);

  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(
      auth,
      (firebaseUser) => {
        setUser(firebaseUser);
      },
      () => {
        // If Firebase auth fails to initialize, fail closed to unauthenticated.
        setUser(null);
      },
    );

    return unsubscribe;
  }, [setUser]);

  return null;
}
