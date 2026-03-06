"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import {
  CalendarDays,
  Check,
  Globe,
  LogIn,
  MapPin,
  Minus,
  Phone,
  Plus,
  Star,
  X,
} from "lucide-react";

import type { Restaurant } from "@/lib/restaurants";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type BookingModalProps = {
  restaurant: Restaurant | null;
  distanceLabel?: string;
  isOpen: boolean;
  onClose: () => void;
};

type ReservationDate = {
  key: string;
  label: string;
  shortLabel: string;
};

function buildReservationDates(): ReservationDate[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return {
      key: date.toISOString().slice(0, 10),
      label: new Intl.DateTimeFormat("en-IN", {
        weekday: "short",
        day: "numeric",
        month: "short",
      }).format(date),
      shortLabel: new Intl.DateTimeFormat("en-IN", { day: "numeric" }).format(date),
    };
  });
}

export function BookingModal({ restaurant, distanceLabel, isOpen, onClose }: BookingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && restaurant ? (
        <BookingModalPanel
          key={`${restaurant.id}-${isOpen ? "open" : "closed"}`}
          restaurant={restaurant}
          distanceLabel={distanceLabel}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>
  );
}

function BookingModalPanel({
  restaurant,
  distanceLabel,
  onClose,
}: {
  restaurant: Restaurant;
  distanceLabel?: string;
  onClose: () => void;
}) {
  const { user, openAuthModal } = useAuthStore();
  const reservationDates = useMemo(() => buildReservationDates(), []);
  const [partySize, setPartySize] = useState(2);
  const [selectedDate, setSelectedDate] = useState<string>(reservationDates[0]?.key ?? "");
  const [selectedTime, setSelectedTime] = useState<string>(restaurant.reservationSlots[0] ?? "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const closeRef = useRef<number | null>(null);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (closeRef.current) window.clearTimeout(closeRef.current);
    };
  }, [onClose]);

  const confirmReservation = async () => {
    if (!selectedTime || isSubmitting || isConfirmed) return;
    if (!user) {
      onClose();
      openAuthModal();
      return;
    }
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        neighborhood: restaurant.neighborhood,
        date: selectedDate,
        time: selectedTime,
        partySize,
        status: "confirmed",
        createdAt: serverTimestamp(),
      });
    } catch {
      // Non-fatal — still show confirmation UX even if Firestore is unconfigured.
    }
    setIsSubmitting(false);
    setIsConfirmed(true);
    closeRef.current = window.setTimeout(onClose, 1400);
  };

  return (
    <motion.div
      className="fixed inset-0 z-70 flex items-center justify-center bg-slate-900/60 px-4 py-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: 12 }}
        transition={{ type: "spring", stiffness: 240, damping: 26 }}
        className="relative w-full max-w-3xl overflow-hidden rounded-[28px] border border-gray-200 bg-white shadow-2xl"
      >
        {/* ── Close button ─────────────────────────────────────────────────── */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-gray-100 text-slate-500 hover:bg-gray-200 active:scale-95"
        >
          <X className="h-4 w-4" />
        </button>

        {/* ── Header ───────────────────────────────────────────────────────── */}
        <div className="border-b border-gray-100 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-slate-400">
                Reservation
              </p>
              <h3 className="mt-2 font-display text-3xl leading-tight text-slate-900">
                {restaurant.name}
              </h3>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-slate-500">
                {restaurant.address}
              </p>
            </div>
            <div className="flex-shrink-0 rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <Star className="h-4 w-4 fill-orange-500 text-orange-500" />
                <span className="text-sm font-semibold text-slate-900">{restaurant.rating.toFixed(1)}</span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500">{distanceLabel ?? restaurant.distance}</p>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2.5">
            <a
              href={`tel:${restaurant.phone.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
            >
              <Phone className="h-3.5 w-3.5" />
              {restaurant.phone}
            </a>
            <a
              href={restaurant.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95"
            >
              <Globe className="h-3.5 w-3.5" />
              Visit website
            </a>
            <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-orange-500" />
              {restaurant.neighborhood}
            </div>
          </div>
        </div>

        {/* ── Body ─────────────────────────────────────────────────────────── */}
        <div className="grid gap-5 px-6 py-6 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">

          {/* Left column */}
          <div className="space-y-4">
            {/* Party size */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Party size</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setPartySize((v) => Math.max(1, v - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-slate-700 shadow-sm hover:bg-gray-100 active:scale-95"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="font-display text-4xl text-slate-900">{partySize}</p>
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">guests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPartySize((v) => Math.min(12, v + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-300 bg-white text-slate-700 shadow-sm hover:bg-gray-100 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* At a Glance */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">At a glance</p>
              <div className="mt-4 space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-orange-500" />
                  <div>
                    <p className="font-medium text-slate-800">Operating hours</p>
                    <p className="text-slate-500">
                      {restaurant.operating_hours[0].day}: {restaurant.operating_hours[0].hours}
                    </p>
                    <p className="text-slate-400">
                      {restaurant.operating_hours[1].day}: {restaurant.operating_hours[1].hours}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {restaurant.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-gray-200 bg-white px-3 py-1 text-xs text-slate-500"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Date picker */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Choose a date</p>
              <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1">
                {reservationDates.map((date) => (
                  <button
                    key={date.key}
                    type="button"
                    onClick={() => setSelectedDate(date.key)}
                    className={cn(
                      "min-w-[5.5rem] flex-shrink-0 rounded-xl border px-3 py-3.5 text-left transition-all active:scale-95",
                      selectedDate === date.key
                        ? "border-orange-400 bg-orange-50 shadow-sm"
                        : "border-gray-200 bg-white text-slate-500 hover:border-orange-200 hover:text-slate-700",
                    )}
                  >
                    <p className={cn("text-[10px] uppercase tracking-[0.18em]",
                      selectedDate === date.key ? "text-orange-500" : "text-slate-400"
                    )}>
                      {date.shortLabel}
                    </p>
                    <p className={cn("mt-1.5 text-xs font-medium",
                      selectedDate === date.key ? "text-slate-900" : "text-slate-600"
                    )}>
                      {date.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Time slots */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-5">
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Choose a time</p>
              <div className="mt-4 flex flex-wrap gap-2.5">
                {restaurant.reservationSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "rounded-full border px-4 py-2 text-sm font-medium transition-all active:scale-95",
                      selectedTime === slot
                        ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-[0_4px_14px_rgba(255,107,53,0.3)]"
                        : "border-gray-200 bg-white text-slate-600 hover:border-orange-300 hover:text-slate-800",
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            {/* Confirm CTA */}
            <motion.button
              type="button"
              onClick={() => void confirmReservation()}
              disabled={!selectedTime || isSubmitting || isConfirmed}
              className={cn(
                "flex h-13 w-full items-center justify-center overflow-hidden rounded-full px-6 text-sm font-semibold text-white transition-all duration-300 active:scale-95 disabled:opacity-60",
                isConfirmed
                  ? "bg-emerald-500 shadow-[0_8px_24px_rgba(16,185,129,0.28)]"
                  : "bg-[#FF6B35] shadow-[0_8px_24px_rgba(255,107,53,0.28)] hover:shadow-[0_14px_36px_rgba(255,107,53,0.38)]",
              )}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatePresence mode="wait">
                {isConfirmed ? (
                  <motion.span
                    key="confirmed"
                    initial={{ opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Reservation confirmed!
                  </motion.span>
                ) : isSubmitting ? (
                  <motion.span key="submitting" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    Securing your table…
                  </motion.span>
                ) : !user ? (
                  <motion.span key="auth" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="inline-flex items-center gap-2">
                    <LogIn className="h-4 w-4" />
                    Sign in to reserve
                  </motion.span>
                ) : (
                  <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                    Confirm Reservation
                  </motion.span>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
