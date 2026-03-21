"use client";

import { ArrowRight, Bot, ChefHat, Map, Sparkles } from "lucide-react";

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

const steps = [
  {
    icon: Map,
    title: "Discover",
    description: "Browse a curated map of the city's finest restaurants, sorted by proximity.",
  },
  {
    icon: Bot,
    title: "Ask Baymax",
    description: "Our AI concierge matches your mood, diet, and budget to the perfect table.",
  },
  {
    icon: ChefHat,
    title: "Reserve",
    description: "Book instantly with one tap. Your confirmation is immediate.",
  },
];

export function DineUpShell({
  restaurants,
  userLocation,
  locationStatus,
  locationError,
  onRequestLocation,
}: DineUpShellProps) {
  return (
    <main className="min-h-screen px-4 pb-10 pt-6 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-450 flex-col gap-8">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden px-2 py-16 sm:py-20 lg:py-24">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-orange-400/10 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-orange-300/8 blur-[100px]" />
          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-orange-500">
              <Sparkles className="h-3 w-3" />
              Curated Reservations
            </div>
            <h1 className="font-display text-5xl leading-[1.1] tracking-tight text-slate-900 sm:text-6xl lg:text-7xl">
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

        {/* ── How It Works ──────────────────────────────────────── */}
        <section id="how-it-works" className="grid gap-4 sm:grid-cols-3">
          {steps.map((step) => (
            <div
              key={step.title}
              className="group rounded-3xl border border-gray-200 bg-white p-7 shadow-sm transition-all hover:border-orange-200 hover:shadow-md"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-50 text-orange-500 transition-colors group-hover:bg-orange-100">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">{step.description}</p>
            </div>
          ))}
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

