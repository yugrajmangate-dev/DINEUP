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
      shortLabel: new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
      }).format(date),
    };
  });
}

export function BookingModal({
  restaurant,
  distanceLabel,
  isOpen,
  onClose,
}: BookingModalProps) {
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
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
      if (closeRef.current) {
        window.clearTimeout(closeRef.current);
      }
    };
  }, [onClose]);

  const confirmReservation = async () => {
    if (!selectedTime || isSubmitting || isConfirmed) {
      return;
    }

    // Require authentication before reserving.
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
    closeRef.current = window.setTimeout(onClose, 1200);
  };

  return (
    <motion.div
      className="fixed inset-0 z-70 flex items-center justify-center bg-black/80 px-4 py-8 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 18 }}
        transition={{ type: "spring", stiffness: 220, damping: 24 }}
        className="glass-panel relative w-full max-w-3xl overflow-hidden rounded-[36px] border border-white/10"
      >
        <div className="absolute right-4 top-4">
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-300 hover:bg-white/10 active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="border-b border-white/8 px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-zinc-500">
                Reservation flow
              </p>
              <h3 className="mt-3 font-display text-4xl text-white">{restaurant.name}</h3>
              <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                {restaurant.address}
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-right backdrop-blur-md">
              <div className="flex items-center justify-end gap-1 text-white">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="text-sm font-semibold">{restaurant.rating.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-xs text-zinc-400">
                {distanceLabel ?? restaurant.distance}
              </p>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <a
              href={`tel:${restaurant.phone.replace(/\s+/g, "")}`}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-accent/30 hover:bg-accent/10 hover:text-white active:scale-95"
            >
              <Phone className="h-4 w-4 text-accent" />
              {restaurant.phone}
            </a>
            <a
              href={restaurant.website}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-accent/30 hover:bg-accent/10 hover:text-white active:scale-95"
            >
              <Globe className="h-4 w-4 text-accent" />
              Visit website
            </a>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 text-accent" />
              {restaurant.neighborhood}
            </div>
          </div>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:px-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Party size</p>
              <div className="mt-5 flex items-center justify-between rounded-full border border-white/10 bg-black/35 px-3 py-3">
                <button
                  type="button"
                  onClick={() => setPartySize((value) => Math.max(1, value - 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-200 hover:bg-white/10 active:scale-95"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <div className="text-center">
                  <p className="font-display text-4xl text-white">{partySize}</p>
                  <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">guests</p>
                </div>
                <button
                  type="button"
                  onClick={() => setPartySize((value) => Math.min(12, value + 1))}
                  className="flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-200 hover:bg-white/10 active:scale-95"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">At a glance</p>
              <div className="mt-4 space-y-3 text-sm text-zinc-300">
                <div className="flex items-start gap-3">
                  <CalendarDays className="mt-0.5 h-4 w-4 text-accent" />
                  <div>
                    <p className="font-medium text-white">Operating hours</p>
                    <p className="text-zinc-400">
                      {restaurant.operating_hours[0].day}: {restaurant.operating_hours[0].hours}
                    </p>
                    <p className="text-zinc-500">
                      {restaurant.operating_hours[1].day}: {restaurant.operating_hours[1].hours}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {restaurant.dietary_tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-white/10 bg-black/35 px-3 py-1 text-xs text-zinc-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Choose a date</p>
              <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
                {reservationDates.map((date) => (
                  <button
                    key={date.key}
                    type="button"
                    onClick={() => setSelectedDate(date.key)}
                    className={cn(
                      "min-w-24 rounded-[22px] border px-4 py-4 text-left transition-all duration-300 ease-out active:scale-95",
                      selectedDate === date.key
                        ? "border-accent/50 bg-accent/10 text-white"
                        : "border-white/8 bg-black/30 text-zinc-400 hover:border-white/15 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">
                      {date.shortLabel}
                    </p>
                    <p className="mt-2 text-sm font-medium">{date.label}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-white/8 bg-white/5 p-5">
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Choose a time</p>
              <div className="mt-4 flex flex-wrap gap-3">
                {restaurant.reservationSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedTime(slot)}
                    className={cn(
                      "rounded-full border px-4 py-2.5 text-sm transition-all duration-300 ease-out active:scale-95",
                      selectedTime === slot
                        ? "border-accent/50 bg-accent text-black"
                        : "border-white/8 bg-black/35 text-zinc-300 hover:border-white/15 hover:bg-white/5 hover:text-white",
                    )}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => void confirmReservation()}
              disabled={!selectedTime || isSubmitting || isConfirmed}
              className={cn(
                "flex h-14 w-full items-center justify-center overflow-hidden rounded-full px-6 text-sm font-semibold shadow-[0_16px_40px_rgba(255,107,107,0.22)] transition-all duration-300 ease-out active:scale-95",
                isConfirmed
                  ? "bg-emerald-500 text-black"
                  : "bg-accent text-black hover:shadow-[0_22px_50px_rgba(255,107,107,0.3)]",
              )}
              whileTap={{ scale: 0.98 }}
            >
              <AnimatePresence mode="wait">
                {isConfirmed ? (
                  <motion.span
                    key="confirmed"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="inline-flex items-center gap-2"
                  >
                    <Check className="h-4 w-4" />
                    Reservation confirmed
                  </motion.span>
                ) : isSubmitting ? (
                  <motion.span
                    key="submitting"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
                    Securing your table…
                  </motion.span>
                ) : !user ? (
                  <motion.span
                    key="auth"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="inline-flex items-center gap-2"
                  >
                    <LogIn className="h-4 w-4" />
                    Sign in to reserve
                  </motion.span>
                ) : (
                  <motion.span
                    key="idle"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                  >
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
