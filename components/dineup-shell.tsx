"use client";

import { useSyncExternalStore } from "react";
import { ArrowRight, Compass, LayoutDashboard, LogOut, Sparkles, UserCircle } from "lucide-react";
import Link from "next/link";

import type { Restaurant } from "@/lib/restaurants";
import type { UserLocation } from "@/lib/geo";
import type { GeolocationStatus } from "@/hooks/use-geolocation";
import { RestaurantSplitView } from "@/components/restaurant-split-view";
import { useAuthStore } from "@/store/auth-store";
import { auth } from "@/lib/firebase";
import { signOut } from "firebase/auth";

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

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
  const { user, status, openAuthModal } = useAuthStore();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const handleSignOut = async () => {
    if (!auth) return;
    try {
      await signOut(auth);
    } catch {
      // ignore sign-out errors
    }
  };

  return (
    <main className="min-h-screen px-4 pb-10 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-400 flex-col gap-6">
        <nav className="glass-panel sticky top-4 z-40 flex items-center justify-between gap-3 rounded-full px-4 py-3 sm:px-6">
          {/* Brand ──────────────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent shadow-[0_0_30px_rgba(255,107,107,0.25)]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl tracking-wide text-white">DineUp</p>
              <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-500">
                Curated Dining
              </p>
            </div>
          </div>

          {/* Centre filter pills (desktop only) ─────────────────────────────── */}
          <div className="hidden items-center gap-2 md:flex">
            {["Culinary Arts", "Chef's Tables", "Late Night"].map((item) => (
              <button
                key={item}
                className="rounded-full px-4 py-2 text-sm text-zinc-400 transition-all duration-300 ease-out hover:bg-white/5 hover:text-white active:scale-95"
              >
                {item}
              </button>
            ))}
          </div>

          {/* Auth controls ──────────────────────────────────────────────────── */}
          <div className="flex shrink-0 items-center gap-2">
            {!mounted || status === "loading" ? (
              <div className="h-9 w-20 animate-pulse rounded-full bg-white/5" />
            ) : status === "authenticated" && user ? (
              <>
                <Link
                  href="/dashboard"
                  className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-all duration-300 hover:border-accent/30 hover:bg-accent/10 hover:text-white active:scale-95 sm:flex"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  My bookings
                </Link>
                <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-accent/15 text-accent">
                  {user.photoURL ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.photoURL}
                      alt={user.displayName ?? "Profile"}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <UserCircle className="h-5 w-5" />
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => void handleSignOut()}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-400 transition-all duration-300 hover:bg-white/10 hover:text-white active:scale-95"
                  title="Sign out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={openAuthModal}
                className="rounded-full bg-accent px-5 py-2.5 text-sm font-semibold text-black shadow-[0_8px_30px_rgba(255,107,107,0.24)] transition-all duration-300 hover:-translate-y-px hover:shadow-[0_14px_40px_rgba(255,107,107,0.3)] active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        </nav>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.5fr)]">
          <div className="glass-panel rounded-4xl border px-6 py-12 sm:px-10 lg:px-12">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-2xl space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-2 text-xs font-medium uppercase tracking-[0.25em] text-accent">
                  <Sparkles className="h-3.5 w-3.5" />
                  Select Reservations
                </div>
                <div className="space-y-4">
                  <h1 className="font-display text-5xl leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
                    Dine brilliantly.
                  </h1>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => {
                     document.getElementById('explore-section')?.scrollIntoView({ behavior: 'smooth' });
                  }}
                  className="group inline-flex items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(255,107,107,0.24)] transition-all duration-300 ease-out hover:-translate-y-px hover:shadow-[0_18px_50px_rgba(255,107,107,0.3)] active:scale-95"
                >
                  Explore tables
                  <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                </button>
              </div>
            </div>
          </div>
        </section>

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
