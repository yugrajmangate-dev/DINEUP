"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { collection, deleteDoc, doc, getDocs, orderBy, query, where } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  Compass,
  LayoutDashboard,
  Loader2,
  MapPin,
  Trash2,
  UserCircle,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { db } from "@/lib/firebase";
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
  const router = useRouter();
  const { user, status } = useAuthStore();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  // Redirect unauthenticated visitors.
  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/");
    }
  }, [status, router]);

  // Fetch bookings from Firestore.
  useEffect(() => {
    if (!user) return;

    const fetchBookings = async () => {
      setIsLoading(true);
      try {
        const q = query(
          collection(db, "bookings"),
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
        );
        const snapshot = await getDocs(q);
        const docs: Booking[] = snapshot.docs.map((docSnap) => ({
          id: docSnap.id,
          ...(docSnap.data() as Omit<Booking, "id">),
        }));
        setBookings(docs);
      } catch {
        // Firestore might be unconfigured in dev — show empty state gracefully.
        setBookings([]);
      } finally {
        setIsLoading(false);
      }
    };

    void fetchBookings();
  }, [user]);

  // Cancel / delete a booking.
  const cancelBooking = async (bookingId: string) => {
    setCancellingId(bookingId);
    try {
      await deleteDoc(doc(db, "bookings", bookingId));
      // Remove optimistically after animation completes (350 ms).
      setTimeout(() => {
        setBookings((prev) => prev.filter((b) => b.id !== bookingId));
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

  // If Zustand says unauthenticated the redirect fires above; render nothing here.
  if (!user) return null;

  const confirmedBookings = bookings.filter((b) => b.status === "confirmed");
  const upcomingCount = confirmedBookings.length;
  const uniqueRestaurants = new Set(bookings.map((b) => b.restaurantId)).size;

  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">

        {/* ── Navigation ─────────────────────────────────────────────────── */}
        <nav className="glass-panel sticky top-4 z-40 flex items-center justify-between gap-3 rounded-full px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent shadow-[0_0_30px_rgba(255,107,107,0.25)]">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <p className="font-display text-xl tracking-wide text-white">DineUp</p>
              <p className="text-xs uppercase tracking-[0.3em] text-zinc-500">My Reservations</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 transition-all hover:border-white/20 hover:bg-white/10 hover:text-white active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Explore
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
          </div>
        </nav>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header className="space-y-2 px-1">
          <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
            Welcome back
          </p>
          <h1 className="font-display text-4xl text-white sm:text-5xl">
            {user.displayName?.split(" ")[0] ?? user.email?.split("@")[0] ?? "Diner"}
          </h1>
          <p className="text-zinc-400">Here are all your DineUp reservations.</p>
        </header>

        {/* ── Summary Bento ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<LayoutDashboard className="h-5 w-5 text-accent" />}
            label="Total bookings"
            value={bookings.length}
          />
          <StatCard
            icon={<CalendarDays className="h-5 w-5 text-accent" />}
            label="Upcoming"
            value={upcomingCount}
            highlight
          />
          <StatCard
            icon={<Compass className="h-5 w-5 text-accent" />}
            label="Restaurants visited"
            value={uniqueRestaurants}
          />
        </div>

        {/* ── Booking Cards ──────────────────────────────────────────────── */}
        {bookings.length === 0 ? (
          <EmptyState />
        ) : (
          <section>
            <h2 className="mb-4 text-sm uppercase tracking-[0.26em] text-zinc-500">
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
      className={`glass-panel rounded-3xl border p-5 ${highlight ? "border-accent/20 bg-accent/5" : ""}`}
    >
      <div className="flex items-center justify-between">
        {icon}
        <span className="font-display text-3xl text-white">{value}</span>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{label}</p>
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
      className="glass-panel group relative overflow-hidden rounded-3xl border border-white/10"
    >
      {/* Status stripe */}
      {isCancelled && (
        <div className="absolute inset-x-0 top-0 h-1 bg-zinc-700" />
      )}
      {!isCancelled && (
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-accent/60 to-accent" />
      )}

      <div className="p-5">
        {/* Venue */}
        <div className="mb-4">
          <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
            {booking.neighborhood ?? "DineUp"}
          </p>
          <h3 className="mt-1 font-display text-xl text-white">{booking.restaurantName}</h3>
        </div>

        {/* Details */}
        <div className="space-y-2.5 text-sm text-zinc-400">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-accent" />
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
            <Clock className="h-4 w-4 text-accent" />
            <span>{booking.time}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-accent" />
            <span>
              {booking.partySize} {booking.partySize === 1 ? "guest" : "guests"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-accent" />
            <span>{booking.neighborhood}</span>
          </div>
        </div>

        {/* Status + Cancel */}
        <div className="mt-5 flex items-center justify-between">
          <span
            className={`rounded-full px-3 py-1 text-xs font-medium ${
              isCancelled
                ? "bg-zinc-800 text-zinc-500"
                : "border border-emerald-500/20 bg-emerald-500/10 text-emerald-400"
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
              className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 opacity-0 transition-all duration-200 group-hover:opacity-100 hover:border-red-400/30 hover:bg-red-500/10 hover:text-red-300 active:scale-95 disabled:pointer-events-none"
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
        className="mb-6 flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-accent/5 shadow-[0_0_40px_rgba(255,107,107,0.15)]"
      >
        <Compass className="h-10 w-10 text-accent" />
      </motion.div>
      <h3 className="font-display text-3xl tracking-wide text-white">No reservations yet</h3>
      <p className="mt-3 max-w-sm text-zinc-400">
        Your culinary journey awaits. Find a table you love, and your confirmed bookings will appear right here.
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-7 py-3.5 text-sm font-semibold text-black shadow-[0_12px_40px_rgba(255,107,107,0.24)] transition-all hover:scale-105 active:scale-95"
      >
        <Compass className="h-4 w-4" />
        Discover Restaurants
      </Link>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <main className="min-h-screen bg-[#0a0a0a] px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <div className="h-16 animate-pulse rounded-full bg-white/5" />
        <div className="space-y-2">
          <div className="h-4 w-24 animate-pulse rounded-full bg-white/5" />
          <div className="h-10 w-48 animate-pulse rounded-full bg-white/5" />
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-52 animate-pulse rounded-3xl bg-white/5" />
          ))}
        </div>
      </div>
    </main>
  );
}
