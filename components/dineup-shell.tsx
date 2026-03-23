"use client";

import { ArrowRight } from "lucide-react";

import type { Restaurant } from "@/lib/restaurants";
import type { UserLocation } from "@/lib/geo";
import type { GeolocationStatus } from "@/hooks/use-geolocation";
import { RestaurantSplitView } from "@/components/restaurant-split-view";

type DineUpShellProps = {
  restaurants: Restaurant[];
  userLocation: UserLocation | null;
  locationStatus: GeolocationStatus;
  locationError: string | null;
  onRequestLocation: () => void;
};

export function DineUpShell({
  restaurants,
  userLocation,
  locationStatus,
  locationError,
  onRequestLocation,
}: DineUpShellProps) {
  return (
    <main className="min-h-screen px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-450 flex-col gap-6">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-2 py-14 sm:py-16 lg:py-20">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-orange-400/10 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-orange-300/8 blur-[100px]" />
          <div className="relative max-w-3xl space-y-6">
            <h1 className="-mt-2 font-display text-5xl leading-[1.1] tracking-tight text-slate-900 sm:-mt-3 sm:text-6xl lg:text-7xl">
              Dine brilliantly.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-slate-500">
              Discover design-forward restaurants. Let our AI concierge match you with the perfect table tonight.
            </p>
            <button
              type="button"
              onClick={() => document.getElementById("explore-section")?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex items-center gap-2 rounded-full bg-[#FF6B35] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,107,53,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(255,107,53,0.38)] active:scale-95"
            >
              Explore tables
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </section>

        {/* ── Restaurant Feed + Map ─────────────────────────────── */}
        <section id="explore-section">
          <RestaurantSplitView
            restaurants={restaurants}
            userLocation={userLocation}
            locationStatus={locationStatus}
            locationError={locationError}
            onRequestLocation={onRequestLocation}
          />
        </section>
      </div>
    </main>
  );
}

