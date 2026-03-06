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
      <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-8">
        {/* ── Hero ───────────────────────────────────────────────── */}
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/5 bg-gradient-to-br from-[#111]/90 via-[#0a0a0a] to-[#111]/90 px-8 py-20 sm:px-14 lg:px-20">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/5 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-accent/3 blur-[100px]" />
          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/15 bg-accent/5 px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-accent">
              <Sparkles className="h-3 w-3" />
              Curated Reservations
            </div>
            <h1 className="font-display text-5xl leading-[1.1] tracking-tight text-white sm:text-6xl lg:text-7xl">
              Dine brilliantly.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-zinc-400">
              Discover design-forward restaurants. Let our AI concierge match you with the perfect table tonight.
            </p>
            <button
              onClick={() => document.getElementById("explore-section")?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-black transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_50px_rgba(255,107,107,0.25)] active:scale-95"
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
              className="group rounded-3xl border border-white/5 bg-[#111]/60 p-7 transition-all hover:border-white/10"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-accent/10 text-accent transition-colors group-hover:bg-accent/15">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg text-white">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{step.description}</p>
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
