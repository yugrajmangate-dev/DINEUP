"use client";

import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { AuthModal } from "@/components/auth-modal";
import { BaymaxChat } from "@/components/baymax-chat";
import { DineUpShell } from "@/components/dineup-shell";
import { useGeolocation } from "@/hooks/use-geolocation";
import { auth } from "@/lib/firebase";
import type { Restaurant } from "@/lib/restaurants";
import { useAuthStore } from "@/store/auth-store";

export function DineUpExperience({ restaurants }: { restaurants: Restaurant[] }) {
  const geolocation = useGeolocation();
  const setUser = useAuthStore((s) => s.setUser);

  // Subscribe to Firebase Auth state once on mount.
  useEffect(() => {
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
