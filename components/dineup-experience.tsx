"use client";

import dynamic from "next/dynamic";

import { DineUpShell } from "@/components/dineup-shell";
import { useGeolocation } from "@/hooks/use-geolocation";
import type { Restaurant } from "@/lib/restaurants";

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
