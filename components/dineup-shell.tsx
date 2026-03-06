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
        <section className="relative overflow-hidden rounded-[2.5rem] border border-[#E8E4DC] bg-white px-8 py-20 shadow-[0_8px_30px_rgb(0,0,0,0.04)] sm:px-14 lg:px-20">
          <div className="absolute -right-40 -top-40 h-96 w-96 rounded-full bg-[#D4AF37]/6 blur-[120px]" />
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-[#D4AF37]/4 blur-[100px]" />
          <div className="relative max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#D4AF37]/20 bg-[#F9F6F0] px-4 py-1.5 text-[11px] font-medium uppercase tracking-[0.25em] text-[#D4AF37]">
              <Sparkles className="h-3 w-3" />
              Curated Reservations
            </div>
            <h1 className="font-display text-5xl leading-[1.1] tracking-tight text-[#1A1A1A] sm:text-6xl lg:text-7xl">
              Dine brilliantly.
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-[#5C5C5C]">
              Discover design-forward restaurants. Let our AI concierge match you with the perfect table tonight.
            </p>
            <button
              onClick={() => document.getElementById("explore-section")?.scrollIntoView({ behavior: "smooth" })}
              className="group inline-flex items-center gap-2 rounded-full bg-[#D4AF37] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(212,175,55,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(212,175,55,0.36)] active:scale-95"
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
              className="group rounded-3xl border border-[#E8E4DC] bg-white p-7 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all hover:border-[#D4AF37]/30 hover:shadow-[0_8px_30px_rgb(0,0,0,0.06)]"
            >
              <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-[#F9F6F0] text-[#D4AF37] transition-colors group-hover:bg-[#FBF8EE]">
                <step.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg text-[#1A1A1A]">{step.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5C5C5C]">{step.description}</p>
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
