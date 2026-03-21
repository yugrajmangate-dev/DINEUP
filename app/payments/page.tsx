"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { CreditCard, IndianRupee, Receipt, Wallet } from "lucide-react";

import { AccountAuthGate } from "@/components/account-auth-gate";
import { restaurants } from "@/lib/restaurants";

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

function estimatePayment(booking: Booking) {
  const restaurant = restaurants.find((item) => item.id === booking.restaurantId);
  const tier = restaurant?.price ?? "₹₹";
  const basePerGuest = tier === "₹" ? 450 : tier === "₹₹" ? 900 : tier === "₹₹₹" ? 1600 : 2400;
  const subtotal = booking.partySize * basePerGuest;
  const platformFee = Math.round(subtotal * 0.04);
  const total = subtotal + platformFee;

  return {
    subtotal,
    platformFee,
    total,
    paymentStatus: booking.status === "cancelled" ? "Refunded" : "Paid",
    paymentMethod: "UPI / Card",
    reference: `DUP-${booking.id.slice(0, 6).toUpperCase()}`,
  };
}

export default function PaymentsPage() {
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
        title="Sign in to view your payments."
        description="Your payment receipts and reservation charges are linked to your DineUp account."
        onSignIn={openAuthModal}
      />
    );
  }

  const payments = bookings.map((booking) => ({ booking, ...estimatePayment(booking) }));
  const totalSpent = payments.filter((item) => item.paymentStatus === "Paid").reduce((sum, item) => sum + item.total, 0);

  return (
    <main className="min-h-screen bg-gray-50 px-4 pb-16 pt-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-8">
        <header className="space-y-4 px-1">
          <p className="text-xs uppercase tracking-[0.28em] text-slate-400">Account</p>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="font-display text-4xl text-slate-900 sm:text-5xl">Payments</h1>
              <p className="mt-2 text-slate-500">Track estimated charges, receipts, and payment references for your reservations.</p>
            </div>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Receipts" value={payments.length.toString()} icon={<Receipt className="h-5 w-5 text-[#FF6B35]" />} />
          <StatCard label="Total spent" value={`₹${totalSpent.toLocaleString("en-IN")}`} icon={<Wallet className="h-5 w-5 text-[#FF6B35]" />} />
          <StatCard label="Primary method" value="UPI / Card" icon={<CreditCard className="h-5 w-5 text-[#FF6B35]" />} />
        </div>

        {payments.length === 0 ? (
          <section className="glass-panel rounded-4xl border border-gray-200 bg-white p-10 text-center text-slate-500">
            No payment history yet. Book a table and receipts will appear here.
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {payments.map((item) => (
              <article key={item.booking.id} className="glass-panel rounded-3xl border border-gray-200 bg-white p-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-slate-400">{item.reference}</p>
                    <h2 className="mt-1 font-display text-2xl text-slate-900">{item.booking.restaurantName}</h2>
                    <p className="mt-1 text-sm text-slate-500">{item.booking.date} · {item.booking.time} · {item.booking.partySize} guests</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.paymentStatus === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-slate-600"}`}>
                    {item.paymentStatus}
                  </span>
                </div>
                <div className="mt-5 grid gap-3 rounded-2xl bg-gray-50 p-4 text-sm text-slate-600">
                  <div className="flex items-center justify-between"><span>Dining subtotal</span><span className="font-semibold text-slate-900">₹{item.subtotal.toLocaleString("en-IN")}</span></div>
                  <div className="flex items-center justify-between"><span>Platform fee</span><span className="font-semibold text-slate-900">₹{item.platformFee.toLocaleString("en-IN")}</span></div>
                  <div className="flex items-center justify-between border-t border-gray-200 pt-3 text-base"><span className="font-semibold text-slate-900">Total</span><span className="inline-flex items-center font-display text-2xl text-slate-900"><IndianRupee className="h-4 w-4" />{item.total.toLocaleString("en-IN")}</span></div>
                </div>
                <p className="mt-4 text-xs text-slate-400">Estimated receipt derived from your reservation tier and party size.</p>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function StatCard({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="glass-panel rounded-3xl border border-gray-200 bg-white p-5">
      <div className="flex items-center justify-between">{icon}<span className="font-display text-3xl text-slate-900">{value}</span></div>
      <p className="mt-3 text-sm text-slate-500">{label}</p>
    </div>
  );
}
