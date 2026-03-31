"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { CalendarDays, Check, LogIn, Minus, Plus, Users, X } from "lucide-react";

import type { Restaurant, RestaurantTable } from "@/lib/restaurants";
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

type AvailabilityPayload = {
  slots: string[];
  tables: RestaurantTable[];
};

function buildDates() {
  return Array.from({ length: 7 }, (_, offset) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + offset);
    return {
      key: date.toISOString().slice(0, 10),
      day: new Intl.DateTimeFormat("en-IN", { weekday: "short" }).format(date),
      label: new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(date),
    };
  });
}

function formatSlot(slot: string) {
  const [hourText, minute] = slot.split(":");
  const hour = Number.parseInt(hourText, 10);
  const meridiem = hour >= 12 ? "PM" : "AM";
  return `${hour % 12 || 12}:${minute} ${meridiem}`;
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
          key={restaurant.id}
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
  const dates = useMemo(() => buildDates(), []);
  const [partySize, setPartySize] = useState(initialPartySize ?? 2);
  const [selectedDate, setSelectedDate] = useState(initialDate ?? dates[0]?.key ?? "");
  const [slots, setSlots] = useState<string[]>([]);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [selectedTime, setSelectedTime] = useState("");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const closeRef = useRef<number | null>(null);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEscape);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onEscape);
      if (closeRef.current) window.clearTimeout(closeRef.current);
    };
  }, [onClose]);

  useEffect(() => {
    let active = true;

    const loadSlots = async () => {
      const response = await fetch(
        `/api/reservations?restaurantId=${encodeURIComponent(restaurant.id)}&date=${selectedDate}&partySize=${partySize}`,
        { cache: "no-store" },
      );

      if (!active) return;

      if (!response.ok) {
        setSlots([]);
        setSelectedTime("");
        setMessage("Unable to load availability right now.");
        return;
      }

      const payload = (await response.json()) as AvailabilityPayload;
      setSlots(payload.slots);
      setSelectedTime((current) => {
        if (payload.slots.includes(current)) return current;
        if (initialTime && payload.slots.includes(initialTime)) return initialTime;
        return payload.slots[0] ?? "";
      });
      setMessage(payload.slots.length ? null : "No tables available for this date.");
    };

    void loadSlots();
    return () => {
      active = false;
    };
  }, [initialTime, partySize, restaurant.id, selectedDate]);

  useEffect(() => {
    if (!selectedTime) {
      setTables([]);
      setSelectedTableId("");
      return;
    }

    let active = true;

    const loadTables = async () => {
      const response = await fetch(
        `/api/reservations?restaurantId=${encodeURIComponent(restaurant.id)}&date=${selectedDate}&partySize=${partySize}&time=${encodeURIComponent(selectedTime)}`,
        { cache: "no-store" },
      );

      if (!active) return;

      if (!response.ok) {
        setTables([]);
        setSelectedTableId("");
        setMessage("Unable to load tables right now.");
        return;
      }

      const payload = (await response.json()) as AvailabilityPayload;
      setTables(payload.tables);
      setSelectedTableId((current) => payload.tables.some((table) => table.id === current) ? current : (payload.tables[0]?.id ?? ""));
    };

    void loadTables();
    return () => {
      active = false;
    };
  }, [partySize, restaurant.id, selectedDate, selectedTime]);

  const confirmReservation = async () => {
    if (!selectedTime || !selectedTableId || isSubmitting || isConfirmed) return;
    if (!user) {
      onClose();
      openAuthModal();
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const response = await fetch("/api/reservations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: restaurant.id,
        date: selectedDate,
        time: selectedTime,
        partySize,
        tableId: selectedTableId,
        customerName: user.displayName ?? user.email ?? "DineUp guest",
        userId: user.uid,
      }),
    });

    const payload = (await response.json()) as {
      error?: string;
      booking?: { tableName: string };
    };

    if (!response.ok) {
      setMessage(payload.error ?? "Booking failed. Please choose another table.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (db) {
        await addDoc(collection(db, "bookings"), {
          userId: user.uid,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          date: selectedDate,
          time: selectedTime,
          partySize,
          tableId: selectedTableId,
          tableName: payload.booking?.tableName ?? "",
          createdAt: serverTimestamp(),
        });
      }
    } catch {
      // Shared JSON db already holds the booking.
    }

    setIsSubmitting(false);
    setIsConfirmed(true);
    setMessage(`Reserved ${payload.booking?.tableName ?? "your table"} on ${selectedDate}.`);
    closeRef.current = window.setTimeout(onClose, 1400);
  };

  return (
    <motion.div
      className="fixed inset-0 z-100 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-md"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 12 }}
        className="relative w-full max-w-3xl overflow-hidden rounded-[2rem] bg-white shadow-[0_30px_80px_rgba(0,0,0,0.32)]"
      >
        <div className="relative h-56">
          <Image src={restaurant.image} alt={restaurant.name} fill className="object-cover" sizes="900px" />
          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-black/40 text-white backdrop-blur-sm"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="absolute inset-x-0 bottom-0 px-6 pb-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">Book with table visibility</p>
            <h2 className="mt-1 font-display text-3xl text-white">{restaurant.name}</h2>
            <p className="mt-2 text-sm text-white/75">{restaurant.cuisine} · {distanceLabel ?? restaurant.distance}</p>
          </div>
        </div>

        {!user ? (
          <div className="space-y-5 p-6">
            <div className="rounded-3xl border border-orange-200 bg-orange-50 p-5">
              <p className="text-[10px] uppercase tracking-[0.28em] text-orange-500">Authentication required</p>
              <h3 className="mt-2 font-display text-2xl text-slate-900">Sign in before booking.</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">
                Your reservations are linked to your account so Baymax and your booking history stay in sync.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                openAuthModal();
              }}
              className="flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-[#FF6B35] text-sm font-bold text-white"
            >
              <LogIn className="h-4 w-4" /> Sign in to continue
            </button>
          </div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">Select date</p>
                  <div className="flex flex-wrap gap-2">
                    {dates.map((date) => {
                      const active = selectedDate === date.key;
                      return (
                        <button
                          key={date.key}
                          type="button"
                          onClick={() => setSelectedDate(date.key)}
                          className={cn(
                            "rounded-2xl border px-4 py-3 text-left transition-all",
                            active ? "border-[#FF6B35] bg-[#FF6B35] text-white" : "border-gray-200 bg-white text-slate-700",
                          )}
                        >
                          <p className="text-[10px] uppercase tracking-[0.2em] opacity-75">{date.day}</p>
                          <p className="mt-1 text-sm font-semibold">{date.label}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">
                    <Users className="mr-1 inline h-3 w-3" />Guests
                  </p>
                  <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-3">
                    <button type="button" onClick={() => setPartySize((value) => Math.max(1, value - 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                      <Minus className="h-3.5 w-3.5" />
                    </button>
                    <div className="text-center">
                      <p className="font-display text-3xl text-slate-900">{partySize}</p>
                      <p className="text-[10px] text-slate-400">{partySize === 1 ? "guest" : "guests"}</p>
                    </div>
                    <button type="button" onClick={() => setPartySize((value) => Math.min(12, value + 1))} className="flex h-10 w-10 items-center justify-center rounded-xl bg-white">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">
                    <CalendarDays className="mr-1 inline h-3 w-3" />Available times
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {slots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setSelectedTime(slot)}
                        className={cn(
                          "rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all",
                          selectedTime === slot
                            ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                            : "border-gray-200 bg-white text-slate-700",
                        )}
                      >
                        {formatSlot(slot)}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-3 text-[10px] uppercase tracking-[0.28em] text-slate-400">Available tables</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {tables.map((table) => (
                      <button
                        key={table.id}
                        type="button"
                        onClick={() => setSelectedTableId(table.id)}
                        className={cn(
                          "rounded-2xl border p-4 text-left transition-all",
                          selectedTableId === table.id
                            ? "border-[#FF6B35] bg-orange-50"
                            : "border-gray-200 bg-white",
                        )}
                      >
                        <p className="text-sm font-semibold text-slate-900">{table.name}</p>
                        <p className="mt-1 text-xs text-slate-500">{table.zone} · Seats {table.capacity}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {message ? (
              <p className={cn("text-sm", isConfirmed ? "text-emerald-600" : "text-orange-600")}>{message}</p>
            ) : null}

            <button
              type="button"
              onClick={() => void confirmReservation()}
              disabled={!selectedTime || !selectedTableId || isSubmitting || isConfirmed}
              className={cn(
                "flex h-14 w-full items-center justify-center gap-2 rounded-2xl text-sm font-bold text-white transition-all disabled:opacity-60",
                isConfirmed ? "bg-emerald-500" : "bg-[#FF6B35]",
              )}
            >
              {isConfirmed ? <><Check className="h-4 w-4" /> Reservation confirmed</> : isSubmitting ? "Securing your table..." : "Confirm reservation"}
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}
