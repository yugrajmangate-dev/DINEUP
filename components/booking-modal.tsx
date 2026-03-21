"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
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
  Users,
  X,
} from "lucide-react";

import type { Restaurant } from "@/lib/restaurants";
import { db } from "@/lib/firebase";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

type BookingModalProps = {
  restaurant: Restaurant | null;
  distanceLabel?: string;
  initialDate?: string;
  initialTime?: string;
  initialPartySize?: number;
  isOpen: boolean;
  onClose: () => void;
};

type ReservationDate = {
  key: string;
  dayLabel: string;
  dateLabel: string;
};

function buildReservationDates(): ReservationDate[] {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return {
      key: date.toISOString().slice(0, 10),
      dayLabel: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
      dateLabel: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date),
    };
  });
}

function formatSlotLabel(slot: string) {
  const match = slot.match(/^(\d{2}):(\d{2})$/);
  if (!match) return slot;
  const hour24 = Number.parseInt(match[1], 10);
  const minute = match[2];
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${meridiem}`;
}

export function BookingModal({
  restaurant,
  distanceLabel,
  initialDate,
  initialTime,
  initialPartySize,
  isOpen,
  onClose,
}: BookingModalProps) {
  return (
    <AnimatePresence>
      {isOpen && restaurant ? (
        <BookingModalPanel
          key={`${restaurant.id}-${initialDate ?? "date"}-${initialTime ?? "time"}-${initialPartySize ?? "party"}`}
          restaurant={restaurant}
          distanceLabel={distanceLabel}
          initialDate={initialDate}
          initialTime={initialTime}
          initialPartySize={initialPartySize}
          onClose={onClose}
        />
      ) : null}
    </AnimatePresence>
  );
}

function BookingModalPanel({
  restaurant,
  distanceLabel,
  initialDate,
  initialTime,
  initialPartySize,
  onClose,
}: {
  restaurant: Restaurant;
  distanceLabel?: string;
  initialDate?: string;
  initialTime?: string;
  initialPartySize?: number;
  onClose: () => void;
}) {
  const { user, openAuthModal } = useAuthStore();
  const reservationDates = useMemo(() => buildReservationDates(), []);
  const validInitialPartySize = typeof initialPartySize === "number"
    ? Math.max(1, Math.min(12, Math.floor(initialPartySize)))
    : 2;
  const hasInitialDate = Boolean(initialDate && reservationDates.some((d) => d.key === initialDate));
  const [partySize, setPartySize] = useState(validInitialPartySize);
  const [selectedDate, setSelectedDate] = useState<string>(hasInitialDate ? (initialDate as string) : (reservationDates[0]?.key ?? ""));
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [slotMessage, setSlotMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [heroImgError, setHeroImgError] = useState(false);
  const closeRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handler);
      if (closeRef.current) window.clearTimeout(closeRef.current);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;

    const loadSlots = async () => {
      try {
        const response = await fetch(
          `/api/reservations?restaurantId=${encodeURIComponent(restaurant.id)}`,
          { cache: "no-store" },
        );

        if (!response.ok) {
          if (!active) return;
          setAvailableSlots([]);
          setSelectedTime("");
          setSlotMessage("Unable to load live slots right now.");
          return;
        }

        const payload = (await response.json()) as { slots?: string[] };
        const slots = payload.slots ?? [];
        if (!active) return;

        const preferredTime = initialTime && slots.includes(initialTime) ? initialTime : slots[0];
        setAvailableSlots(slots);
        setSelectedTime(preferredTime ?? "");
        setSlotMessage(slots.length ? null : "No live slots available for now.");
      } catch {
        if (!active) return;
        setAvailableSlots([]);
        setSelectedTime("");
        setSlotMessage("Unable to load live slots right now.");
      }
    };

    void loadSlots();

    return () => {
      active = false;
    };
  }, [initialTime, restaurant.id]);

  const confirmReservation = async () => {
    if (!selectedTime || isSubmitting || isConfirmed) return;
    if (!user) { onClose(); openAuthModal(); return; }
    setIsSubmitting(true);

    try {
      const reservationResponse = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restaurantId: restaurant.id,
          time: selectedTime,
          partySize,
        }),
      });

      const reservationPayload = (await reservationResponse.json()) as {
        message?: string;
        remainingSlots?: string[];
      };

      if (!reservationResponse.ok) {
        if (reservationResponse.status === 409) {
          const remainingSlots = reservationPayload.remainingSlots ?? [];
          setAvailableSlots(remainingSlots);
          setSelectedTime(remainingSlots[0] ?? "");
          setSlotMessage(reservationPayload.message ?? "That slot was just taken. Please pick another time.");
          setIsSubmitting(false);
          return;
        }

        setSlotMessage(reservationPayload.message ?? "Booking failed. Please try another slot.");
        setIsSubmitting(false);
        return;
      }

      setSlotMessage(null);
      await addDoc(collection(db, "bookings"), {
        userId: user.uid,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        neighborhood: restaurant.neighborhood,
        date: selectedDate,
        time: formatSlotLabel(selectedTime),
        partySize,
        status: "confirmed",
        createdAt: serverTimestamp(),
      });

      setAvailableSlots((previous) => previous.filter((slot) => slot !== selectedTime));
    } catch { /* non-fatal */ }
    setIsSubmitting(false);
    setIsConfirmed(true);
    closeRef.current = window.setTimeout(onClose, 1600);
  };

  const heroImage = heroImgError
    ? restaurant.image   // fall back to main image if food_images[0] fails
    : (restaurant.food_images?.[0] ?? restaurant.image);

  return (
    <motion.div
      className="fixed inset-0 z-100 flex items-center justify-center p-4 sm:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ background: "rgba(10,10,20,0.72)", backdropFilter: "blur(12px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.93, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ type: "spring", stiffness: 280, damping: 28 }}
        className="relative w-full max-w-2xl overflow-hidden rounded-4xl bg-white shadow-[0_32px_80px_rgba(0,0,0,0.28)]"
      >
        {/* -- HERO IMAGE HEADER ------------------------------------------------ */}
        <div className="relative h-52 w-full overflow-hidden">
          <Image
            src={heroImage}
            alt={restaurant.name}
            fill
            className="object-cover"
            sizes="672px"
            onError={() => setHeroImgError(true)}
          />
          {/* Deep gradient overlay so text is always readable */}
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/30 to-transparent" />

          {/* Close button � top right */}
          <button
            type="button"
            title="Close booking dialog"
            aria-label="Close booking dialog"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm hover:bg-black/60 active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>

          {/* Restaurant info over image */}
          <div className="absolute bottom-0 left-0 right-0 px-6 pb-5 pt-10">
            <p className="text-[10px] uppercase tracking-[0.3em] text-white/60">Reserve your table</p>
            <h2 className="mt-1 font-display text-3xl font-bold leading-tight text-white">
              {restaurant.name}
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <span className="flex items-center gap-1 text-xs text-white/75">
                <MapPin className="h-3 w-3" />{restaurant.neighborhood}
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-sm">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {restaurant.rating.toFixed(1)}
              </span>
              <span className="text-xs text-white/60">{restaurant.price}</span>
              <span className="text-xs text-white/60">{distanceLabel ?? restaurant.distance}</span>
            </div>
          </div>
        </div>

        {/* -- CONTACT PILLS ----------------------------------------------------- */}
        <div className="flex flex-wrap gap-2 border-b border-gray-100 px-6 py-4">
          <a
            href={`tel:${restaurant.phone.replace(/\s+/g, "")}`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 transition-all"
          >
            <Phone className="h-3 w-3" />{restaurant.phone}
          </a>
          <a
            href={restaurant.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 bg-gray-50 px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 transition-all"
          >
            <Globe className="h-3 w-3" />Visit website
          </a>
        </div>

        {/* -- BODY -------------------------------------------------------------- */}
        <div className="px-6 py-5 sm:px-7">
          {!user ? (
            <div className="space-y-5">
              <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
                <p className="text-[10px] uppercase tracking-[0.28em] text-orange-500">Authentication required</p>
                <h3 className="mt-2 font-display text-2xl text-slate-900">Sign in before booking.</h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  Your reservation is linked to your DineUp account so it can appear in My Bookings and be managed later.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    openAuthModal();
                  }}
                  className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] text-sm font-bold text-white shadow-[0_8px_30px_rgba(255,107,53,0.35)] hover:shadow-[0_14px_40px_rgba(255,107,53,0.45)] active:scale-[0.98]"
                >
                  <LogIn className="h-4 w-4" /> Sign in to continue
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-14 items-center justify-center rounded-2xl border border-gray-200 bg-white text-sm font-semibold text-slate-700 hover:border-orange-200 hover:bg-orange-50 active:scale-[0.98]"
                >
                  Maybe later
                </button>
              </div>
            </div>
          ) : (
          <>
          {/* DATE SELECTOR */}
          <div className="mb-5">
            <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">Select date</p>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {reservationDates.map((d) => {
                const active = selectedDate === d.key;
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => setSelectedDate(d.key)}
                    className={cn(
                      "flex min-w-18 shrink-0 flex-col items-center rounded-2xl border px-3 py-3 transition-all active:scale-95",
                      active
                        ? "border-[#FF6B35] bg-[#FF6B35] shadow-[0_6px_20px_rgba(255,107,53,0.3)]"
                        : "border-gray-200 bg-white hover:border-orange-200 hover:bg-orange-50",
                    )}
                  >
                    <span className={cn("text-[10px] uppercase tracking-widest", active ? "text-white/75" : "text-slate-400")}>
                      {d.dayLabel}
                    </span>
                    <span className={cn("mt-1 text-sm font-semibold", active ? "text-white" : "text-slate-800")}>
                      {d.dateLabel}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TWO COLUMN: Party Size + Time Slots */}
          <div className="grid gap-5 sm:grid-cols-2">

            {/* PARTY SIZE */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">
                <Users className="mr-1 inline h-3 w-3" />Guests
              </p>
              <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-3">
                <button
                  type="button"
                  title="Decrease guests"
                  aria-label="Decrease guests"
                  onClick={() => setPartySize((v) => Math.max(1, v - 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-slate-600 shadow-sm hover:bg-gray-100 active:scale-95"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <div className="text-center">
                  <p className="font-display text-3xl font-bold text-slate-900">{partySize}</p>
                  <p className="text-[10px] text-slate-400">{partySize === 1 ? "guest" : "guests"}</p>
                </div>
                <button
                  type="button"
                  title="Increase guests"
                  aria-label="Increase guests"
                  onClick={() => setPartySize((v) => Math.min(12, v + 1))}
                  className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-300 bg-white text-slate-600 shadow-sm hover:bg-gray-100 active:scale-95"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Dietary tags */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {restaurant.dietary_tags.map((tag) => (
                  <span key={tag} className="rounded-full border border-gray-200 bg-white px-2.5 py-1 text-[10px] font-medium text-slate-500">
                    {tag}
                  </span>
                ))}
              </div>
            </div>

            {/* TIME SLOTS */}
            <div>
              <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">
                <CalendarDays className="mr-1 inline h-3 w-3" />Time slot
              </p>
              <div className="flex flex-wrap gap-2">
                {availableSlots.map((slot) => {
                  const active = selectedTime === slot;
                  return (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTime(slot)}
                      className={cn(
                        "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all active:scale-95",
                        active
                          ? "border-[#FF6B35] bg-[#FF6B35] text-white shadow-[0_4px_14px_rgba(255,107,53,0.32)]"
                          : "border-gray-200 bg-white text-slate-700 hover:border-orange-200 hover:bg-orange-50",
                      )}
                    >
                      {formatSlotLabel(slot)}
                    </button>
                  );
                })}
              </div>
              {slotMessage && (
                <p className="mt-2 text-xs text-orange-600">{slotMessage}</p>
              )}
            </div>
          </div>

          {/* CONFIRM BUTTON */}
          <motion.button
            type="button"
            onClick={() => void confirmReservation()}
            disabled={!selectedTime || isSubmitting || isConfirmed}
            className={cn(
              "mt-6 flex h-14 w-full items-center justify-center gap-2 overflow-hidden rounded-2xl text-[15px] font-bold text-white transition-all duration-300 active:scale-[0.98] disabled:opacity-60",
              isConfirmed
                ? "bg-emerald-500 shadow-[0_8px_30px_rgba(16,185,129,0.35)]"
                : "bg-[#FF6B35] shadow-[0_8px_30px_rgba(255,107,53,0.35)] hover:shadow-[0_14px_40px_rgba(255,107,53,0.45)]",
            )}
            whileTap={{ scale: 0.98 }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isConfirmed ? (
                <motion.span key="ok" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex items-center gap-2">
                  <Check className="h-5 w-5" /> Reservation confirmed!
                </motion.span>
              ) : isSubmitting ? (
                <motion.span key="wait" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  Securing your table�
                </motion.span>
              ) : (
                <motion.span key="idle" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
                  Confirm Reservation
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
          </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}


