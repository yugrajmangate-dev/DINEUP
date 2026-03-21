"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { deleteDoc, doc } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  CalendarDays,
  Clock,
  Compass,
  LayoutDashboard,
  Loader2,
  MapPin,
  Trash2,
  Users,
} from "lucide-react";
import Link from "next/link";

import { AccountAuthGate } from "@/components/account-auth-gate";
import { db } from "@/lib/firebase";
import { fetchUserBookings, getCachedUserBookings, setCachedUserBookings } from "@/lib/user-bookings-cache";
import { useAuthStore } from "@/store/auth-store";

// ─── Types ────────────────────────────────────────────────────────────────────

type BookingStatus = "confirmed" | "cancelled";

interface Booking {
  id: string;
  restaurantId: string;
  restaurantName: string;
  neighborhood: string;
  date: string;
  time: string;
  partySize: number;
  status: BookingStatus;
  createdAt: { seconds: number } | null;
}

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, status, openAuthModal } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Prompt unauthenticated visitors to sign in instead of hard-redirecting.
  useEffect(() => {
    if (status === "unauthenticated") {
      openAuthModal();
    }
  }, [openAuthModal, status]);

  // Fetch bookings from Firestore.
  useEffect(() => {
    if (!user) return;
    let active = true;

    const cached = getCachedUserBookings(user.uid);
    if (cached) {
      setBookings(cached as Booking[]);
      setIsLoading(false);
    } else {
      setIsLoading(true);
    }

    const fetchBookings = async () => {
      try {
        const docs = await fetchUserBookings(user.uid, !cached);
        if (active) {
          setBookings(docs as Booking[]);
        }
      } catch {
        // Firestore might be unconfigured in dev — show empty state gracefully.
        if (active) {
          setBookings([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void fetchBookings();

    return () => {
      active = false;
    };
  }, [user]);

  // Cancel / delete a booking.
  const cancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      // Remove optimistically after animation completes (350 ms).
      setTimeout(() => {
        setBookings((prev) => {
          const updated = prev.filter((b) => b.id !== bookingId);
          if (user) {
            setCachedUserBookings(user.uid, updated as Booking[]);
          }
          return updated;
        });
        setCancellingId(null);
      }, 350);
    } catch {
      setCancellingId(null);
    }
  };

  // While auth state is resolving, render a loading skeleton.
  if (!mounted || status === "loading" || (status === "authenticated" && isLoading)) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return (
      <AccountAuthGate
        title="Sign in to view your reservations."
        description="Your booking history is tied to your DineUp account. Sign in first, then this page will immediately show all your confirmed reservations."
        onSignIn={openAuthModal}
      />
    );
  }

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const upcomingCount = confirmedBookings.length;
  const uniqueRestaurants = new Set(bookings.map((b) => b.restaurantId)).size;

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="space-y-2 px-1">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">
            Welcome back
          </p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl text-slate-900 sm:text-5xl">
                {user.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Diner"}
              </h1>
              <p className="mt-2 text-slate-500">Here are all your DineUp reservations.</p>
            </div>
          </div>
        </header>

        {/* ── Summary Bento ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<LayoutDashboard className="h-5 w-5 text-[#FF6B35]" />}
            label="Total bookings"
            value={bookings.length}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-[#FF6B35]" />}
            label="Upcoming"
            value={upcomingCount}
            highlight
          />
          <StatCard
            icon={<Compass className="h-5 w-5 text-[#FF6B35]" />}
            label="Restaurants visited"
            value={uniqueRestaurants}
          />
        </div>

        {/* ── Booking Cards ──────────────────────────────────────────────── */}
        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <section>
            <h2 className="mb-4 text-sm uppercase tracking-[0.26em] text-slate-400">
              Your reservations
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {bookings.map((booking) => (
                  <BookingCard
                    key={booking.id}
                    booking={booking}
                    isCancelling={cancellingId === booking.id}
                    onCancel={() => void cancelBooking(booking.id)}
                  />
                ))}
              </AnimatePresence>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`glass-panel rounded-3xl border p-5 ${highlight ? "border-orange-200 bg-orange-50" : ""}`}
    >
      <div className="flex items-center justify-between">
        {icon}
        <span className="font-display text-3xl text-slate-900">{value}</span>
      </div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
    </div>
  );
}

function BookingCard({
  booking,
  isCancelling,
  onCancel,
}: {
  booking: Booking;
  isCancelling: boolean;
  onCancel: () => void;
}) {
  const isCancelled = booking.status === "cancelled";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95, y: 16 }}
      animate={
        isCancelling
          ? { opacity: 0, scale: 0.88, y: 8 }
          : { opacity: 1, scale: 1, y: 0 }
      }
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
      className="glass-panel group relative overflow-hidden rounded-3xl border border-gray-200"
    >
      {/* Status stripe */}
      {isCancelled && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gray-200" />
      )}
      {!isCancelled && (
        <div className="absolute inset-x-0 top-0 h-1 bg-linear-to-r from-[#FF6B35]/60 to-[#FF6B35]" />
      )}

      <div className="p-5">
        {/* Venue */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
            {booking.neighborhood ?? "DineUp"}
          </p>
          <h3 className="mt-1 font-display text-xl text-slate-900">{booking.restaurantName}</h3>
        </div>

        {/* Details */}
        <div className="space-y-2.5 text-sm text-slate-500">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#FF6B35]" />
            <span>
              {new Intl.DateTimeFormat("en-IN", {
                weekday: "short",
                day: "numeric",
                month: "short",
                year: "numeric",
              }).format(new Date(booking.date))}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#FF6B35]" />
            <span>{booking.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-[#FF6B35]" />
            <span>
              {booking.partySize} {booking.partySize === 1 ? "guest" : "guests"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-[#FF6B35]" />
            <span>{booking.neighborhood}</span>
          </div>
        </div>

        {/* Status + Cancel */}
        <div className="mt-5 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isCancelled
                ? "bg-[#F5F5F5] text-[#5C5C5C]"
                : "border border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            {isCancelled ? "Cancelled" : "Confirmed"}
          </span>

          {!isCancelled && (
            <motion.button
              type="button"
              onClick={onCancel}
              disabled={isCancelling}
              whileTap={{ scale: 0.92 }}
              className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-slate-500 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:border-red-200 hover:bg-red-50 hover:text-red-600 active:scale-95 disabled:pointer-events-none"
            >
              {isCancelling ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              Cancel
            </motion.button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyState() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="flex flex-col items-center py-20 text-center"
    >
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.1 }}
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-orange-100 bg-orange-50 shadow-[0_4px_24px_rgba(255,107,53,0.12)]"
      >
        <Compass className="h-10 w-10 text-[#FF6B35]" />
      </motion.div>
      <h3 className="font-display text-3xl tracking-wide text-slate-900">No reservations yet</h3>
      <p className="mt-3 max-w-sm text-slate-500">
        Your culinary journey awaits. Find a table you love, and your confirmed bookings will appear right here.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#FF6B35] px-7 py-3.5 text-sm font-semibold text-white shadow-[0_8px_24px_rgba(255,107,53,0.28)] transition-all hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(255,107,53,0.38)] active:scale-95"
      >
        <Compass className="h-4 w-4" />
        Discover Restaurants
      </Link>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="h-16 animate-pulse rounded-full bg-gray-100" />
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded-full bg-gray-100" />
          <div className="h-10 w-48 animate-pulse rounded-full bg-gray-100" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-gray-100" />
          ))}
        </div>
      </div>
    </main>
  );
}

