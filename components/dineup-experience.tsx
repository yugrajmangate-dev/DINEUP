"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { DineUpShell } from "@/components/dineup-shell";
import { useGeolocation } from "@/hooks/use-geolocation";
import { auth } from "@/lib/firebase";
import type { Restaurant } from "@/lib/restaurants";
import { useAuthStore } from "@/store/auth-store";

const BaymaxChat = dynamic(
  () => import("@/components/baymax-chat").then((mod) => mod.BaymaxChat),
  { ssr: false },
);

const AuthModal = dynamic(
  () => import("@/components/auth-modal").then((mod) => mod.AuthModal),
  { ssr: false },
);

export function DineUpExperience({ restaurants }: { restaurants: Restaurant[] }) {
  const geolocation = useGeolocation();
  const setUser = useAuthStore((s) => s.setUser);

  // Subscribe to Firebase Auth state once on mount.
  useEffect(() => {
    if (!auth) {
      setUser(null);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return unsubscribe;
  }, [setUser]);

  return (
    <>
      <DineUpShell
        restaurants={restaurants}
        userLocation={geolocation.location}
        locationStatus={geolocation.status}
        locationError={geolocation.error}
        onRequestLocation={geolocation.requestLocation}
      />
      <BaymaxChat
        userLocation={geolocation.location}
        locationStatus={geolocation.status}
      />
      {/* Global auth modal — rendered here so it floats above everything */}
      <AuthModal />
    </>
  );
}
