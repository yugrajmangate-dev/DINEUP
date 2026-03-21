"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CalendarDays, MapPin, Users } from "lucide-react";

import { AccountAuthGate } from "@/components/account-auth-gate";
import { fetchUserBookings, getCachedUserBookings } from "@/lib/user-bookings-cache";
import { useAuthStore } from "@/store/auth-store";

type BookingStatus = "confirmed" | "cancelled";

type Booking = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  neighborhood: string;
  date: string;
  time: string;
  partySize: number;
  status: BookingStatus;
  createdAt: { seconds: number } | null;
};

const subscribe = () => () => {};
const getSnapshot = () => true;
const getServerSnapshot = () => false;

export default function OrderHistoryPage() {
  const { user, status, openAuthModal } = useAuthStore();
  const mounted = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (status === "unauthenticated") openAuthModal();
  }, [openAuthModal, status]);

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

    const load = async () => {
      try {
        const docs = await fetchUserBookings(user.uid, !cached);
        if (active) {
          setBookings(docs as Booking[]);
        }
      } catch {
        if (active) {
          setBookings([]);
        }
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, [user]);

  if (!mounted || status === "loading" || (status === "authenticated" && isLoading)) {
    return <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-8 sm:px-6 lg:px-8"><div className="mx-auto max-w-6xl"><div className="h-52 animate-pulse rounded-4xl bg-white" /></div></main>;
  }

  if (!user) {
    return (
      <AccountAuthGate
        title="Sign in to view your order history."
        description="Every reservation you place through DineUp appears in your account history so you can revisit it later."
        onSignIn={openAuthModal}
      />
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 px-1">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Account</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl text-slate-900 sm:text-5xl">Order History</h1>
              <p className="mt-2 text-slate-500">A complete timeline of the reservations placed through your DineUp account.</p>
            </div>
          </div>
        </header>

        {bookings.length === 0 ? (
          <section className="glass-panel rounded-4xl border border-gray-200 bg-white p-10 text-center text-slate-500">
            No reservations yet. Once you book a table, it will appear here.
          </section>
        ) : (
          <section className="space-y-4">
            {bookings.map((booking) => (
              <article key={booking.id} className="glass-panel rounded-3xl border border-gray-200 bg-white p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">Reservation</p>
                    <h2 className="mt-1 font-display text-2xl text-slate-900">{booking.restaurantName}</h2>
                    <div className="mt-3 flex flex-wrap gap-3 text-sm text-slate-500">
                      <span className="inline-flex items-center gap-1"><MapPin className="h-4 w-4 text-[#FF6B35]" />{booking.neighborhood}</span>
                      <span className="inline-flex items-center gap-1"><CalendarDays className="h-4 w-4 text-[#FF6B35]" />{booking.date} · {booking.time}</span>
                      <span className="inline-flex items-center gap-1"><Users className="h-4 w-4 text-[#FF6B35]" />{booking.partySize} guests</span>
                    </div>
                  </div>
                  <span className={`rounded-full px-4 py-2 text-sm font-semibold ${booking.status === "confirmed" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-slate-600"}`}>
                    {booking.status === "confirmed" ? "Confirmed" : "Cancelled"}
                  </span>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}
