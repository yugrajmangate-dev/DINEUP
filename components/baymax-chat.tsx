"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  CalendarCheck,
  CheckCircle2,
  Clock,
  MapPin,
  SendHorizonal,
  Sparkles,
  Star,
  XCircle,
  X,
} from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";

import type { GeolocationStatus } from "@/hooks/use-geolocation";
import type { UserLocation } from "@/lib/geo";
import { restaurants } from "@/lib/restaurants";
import { BookingModal } from "@/components/booking-modal";
import { cn } from "@/lib/utils";

// ─── Types for tool parts ─────────────────────────────────────────────────────

interface ToolCallPart {
  type: "tool-call";
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
}

interface ToolResultPart {
  type: "tool-result";
  toolCallId: string;
  toolName: string;
  result: Record<string, unknown>;
}

type MessagePart = { type: "text"; text: string } | ToolCallPart | ToolResultPart;

// ─── Starter message (display-only, never sent to the API) ─────────────────

const STARTER_ID = "baymax-intro";

const starterBubble: UIMessage = {
  id: STARTER_ID,
  role: "assistant",
  parts: [{ type: "text", text: "Hello. I am Baymax — your personal dining concierge." }],
};

// ─── Sub-components for tool renders ─────────────────────────────────────────

/** Spinning indicator while a tool is in-flight */
function ToolCallingBadge({ toolName }: { toolName: string }) {
  const label =
    toolName === "checkAvailability"
      ? "Checking availability…"
      : toolName === "initiateBooking"
        ? "Loading booking card…"
        : `Running ${toolName}…`;

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2 rounded-full border border-[#E8E4DC] bg-[#F9F6F0] px-4 py-2.5 text-xs text-[#5C5C5C] shadow-[0_4px_12px_rgb(0,0,0,0.05)]">
        <motion.span
          className="h-2 w-2 rounded-full bg-[#D4AF37]"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ duration: 1, repeat: Number.POSITIVE_INFINITY }}
        />
        {label}
      </div>
    </div>
  );
}

/** Availability result card */
function AvailabilityResultCard({ result }: { result: Record<string, unknown> }) {
  const available = result.available as boolean;
  const message = result.message as string;

  return (
    <div className="flex justify-start">
      <div
        className={cn(
          "max-w-[90%] rounded-3xl border px-4 py-3.5 text-sm leading-6 shadow-[0_4px_16px_rgb(0,0,0,0.06)]",
          available
            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
            : "border-red-200 bg-red-50 text-red-700",
        )}
      >
        <div className="flex items-start gap-2">
          {available ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          ) : (
            <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
          )}
          <span>{message}</span>
        </div>
      </div>
    </div>
  );
}

/** Mini booking card rendered when Baymax calls initiateBooking */
function BookingCard({
  result,
  onBook,
}: {
  result: Record<string, unknown>;
  onBook: (restaurantId: string) => void;
}) {
  const restaurantId = result.restaurantId as string;
  const restaurantName = result.restaurantName as string;
  const neighborhood = result.neighborhood as string;
  const cuisine = result.cuisine as string;
  const rating = result.rating as number;
  const price = result.price as string;
  const slots = result.slots as string[];

  return (
    <div className="flex justify-start">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-[90%] overflow-hidden rounded-3xl border border-[#E8E4DC] bg-white shadow-[0_8px_30px_rgb(0,0,0,0.07)]"
      >
        {/* Header */}
        <div className="border-b border-[#E8E4DC] px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.22em] text-[#5C5C5C]">{cuisine}</p>
              <p className="mt-0.5 font-semibold text-[#1A1A1A]">{restaurantName}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-[#E8E4DC] bg-[#F9F6F0] px-2.5 py-1.5 text-xs text-[#D4AF37]">
              <Star className="h-3 w-3 fill-[#D4AF37] text-[#D4AF37]" />
              {rating.toFixed(1)}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#5C5C5C]">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {neighborhood}
            </span>
            <span>{price}</span>
          </div>
        </div>

        {/* Time slots */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-[#5C5C5C]">Available tonight</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <span
                key={slot}
                className="flex items-center gap-1 rounded-full border border-[#E8E4DC] bg-[#F9F6F0] px-3 py-1.5 text-xs text-[#1A1A1A]"
              >
                <Clock className="h-3 w-3 text-[#D4AF37]" />
                {slot}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => onBook(restaurantId)}
            className="flex w-full items-center justify-center gap-2 rounded-full bg-[#D4AF37] py-2.5 text-sm font-semibold text-white shadow-[0_6px_20px_rgba(212,175,55,0.28)] hover:shadow-[0_10px_28px_rgba(212,175,55,0.36)] active:scale-95"
          >
            <CalendarCheck className="h-4 w-4" />
            Reserve table
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

type BaymaxChatProps = {
  userLocation: UserLocation | null;
  locationStatus: GeolocationStatus;
};

// ─── Main component ────────────────────────────────────────────────────────────

export function BaymaxChat({ userLocation, locationStatus }: BaymaxChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [bookingRestaurantId, setBookingRestaurantId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(
    () => [
      "Find me a great dinner nearby",
      "Reserve Terra Bloom",
      "Is Cinder House free tonight?",
    ],
    [],
  );

  const transport = useMemo(
    () => new DefaultChatTransport({ api: "/api/chat" }),
    [],
  );

  const { error, messages, sendMessage, status } = useChat({
    transport,
    experimental_throttle: 40,
  });

  // Merge the display-only starter bubble with real API messages
  const allMessages = useMemo(
    () => [starterBubble, ...messages],
    [messages],
  );

  const isThinking = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [allMessages, isThinking]);

  const submitMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput("");
    setIsOpen(true);
    await sendMessage({ text: trimmed }, { body: { userLocation } });
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage(input);
  };

  // Look up full restaurant from inventory for the BookingModal
  const bookingRestaurant = useMemo(
    () => restaurants.find((r) => r.id === bookingRestaurantId) ?? null,
    [bookingRestaurantId],
  );

  return (
    <>
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-4 sm:bottom-6 sm:right-6">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 18, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.96 }}
              transition={{ type: "spring", stiffness: 260, damping: 24 }}
              className="w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-4xl border border-[#E8E4DC] bg-white shadow-[0_24px_80px_rgb(0,0,0,0.1)]"
            >
              {/* Header ──────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between border-b border-[#E8E4DC] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#F9F6F0] text-[#D4AF37]">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#1A1A1A]">Baymax</p>
                    <p className="text-xs text-[#5C5C5C]">
                      {locationStatus === "ready" ? "Location-aware · AI Concierge" : "AI Dining Concierge"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E8E4DC] bg-[#FAFAFA] text-[#5C5C5C] hover:bg-[#F9F6F0] active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages ────────────────────────────────────────────────── */}
              <div
                ref={scrollRef}
                className="max-h-105 space-y-3 overflow-y-auto px-5 py-5"
              >
                {allMessages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    {(message.parts as MessagePart[]).map((part, partIdx) => {
                      // Plain text bubble
                      if (part.type === "text" && part.text.trim()) {
                        return (
                          <div
                            key={partIdx}
                            className={cn(
                              "flex",
                              message.role === "user" ? "justify-end" : "justify-start",
                            )}
                          >
                            <div
                              className={cn(
                                "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6",
                                message.role === "user"
                                  ? "bg-[#FBF8EE] text-[#1A1A1A] border border-[#D4AF37]/30 shadow-[0_2px_8px_rgba(212,175,55,0.1)]"
                                  : "bg-[#F9F6F0] text-[#1A1A1A] shadow-[0_2px_8px_rgb(0,0,0,0.04)]",
                              )}
                            >
                              {part.text}
                            </div>
                          </div>
                        );
                      }

                      // Tool-call in-progress badge (only show while streaming)
                      if (part.type === "tool-call") {
                        const hasResult = (message.parts as MessagePart[]).some(
                          (p) =>
                            p.type === "tool-result" &&
                            (p as ToolResultPart).toolCallId === part.toolCallId,
                        );
                        if (hasResult) return null; // result arrived — don't double-render
                        return <ToolCallingBadge key={partIdx} toolName={part.toolName} />;
                      }

                      // Tool results
                      if (part.type === "tool-result") {
                        const result = part.result;

                        if (part.toolName === "checkAvailability") {
                          return (
                            <AvailabilityResultCard key={partIdx} result={result} />
                          );
                        }

                        if (part.toolName === "initiateBooking" && !result.error) {
                          return (
                            <BookingCard
                              key={partIdx}
                              result={result}
                              onBook={(id) => {
                                setBookingRestaurantId(id);
                              }}
                            />
                          );
                        }
                      }

                      return null;
                    })}
                  </div>
                ))}

                {error ? (
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-3xl border border-red-200 bg-red-50 px-4 py-3 text-sm leading-6 text-red-700">
                      My connection to the gastronomy database is unstable right now. Please try again.
                    </div>
                  </div>
                ) : null}

                <AnimatePresence>
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-center gap-1 rounded-full bg-[#F9F6F0] px-4 py-3 text-[#5C5C5C] shadow-[0_4px_12px_rgb(0,0,0,0.06)]">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="h-2 w-2 rounded-full bg-[#D4AF37]/60"
                            animate={{ y: [0, -5, 0] }}
                            transition={{
                              duration: 0.8,
                              repeat: Number.POSITIVE_INFINITY,
                              delay: dot * 0.12,
                            }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Input ───────────────────────────────────────────────────── */}
              <div className="border-t border-[#E8E4DC] px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitMessage(prompt)}
                      className="rounded-full border border-[#E8E4DC] bg-[#F9F6F0] px-3 py-2 text-xs text-[#5C5C5C] hover:border-[#D4AF37]/40 hover:text-[#1A1A1A] active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-3 rounded-full border border-[#E8E4DC] bg-[#FAFAFA] px-4 py-3 focus-within:border-[#D4AF37]/50">
                    <Sparkles className="h-4 w-4 text-[#D4AF37]" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Baymax for a perfect table…"
                      className="w-full bg-transparent text-sm text-[#1A1A1A] outline-none placeholder:text-[#5C5C5C]/60"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-[#D4AF37] text-white shadow-[0_8px_24px_rgba(212,175,55,0.3)] hover:shadow-[0_12px_32px_rgba(212,175,55,0.38)] active:scale-95 disabled:opacity-50"
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* FAB ──────────────────────────────────────────────────────────── */}
        <motion.button
          type="button"
          onClick={() => setIsOpen((current) => !current)}
          whileTap={{ scale: 0.95 }}
          whileHover={{ scale: 1.05 }}
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-[#D4AF37] text-white shadow-[0_16px_50px_rgba(212,175,55,0.35)] transition-all"
        >
          <motion.span 
            className="absolute inset-0 rounded-full bg-[#D4AF37]/30 blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.7, 0.5] }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="absolute -inset-1.5 rounded-full border border-[#D4AF37]/25" />
          <Bot className="relative z-10 h-6 w-6" />
        </motion.button>
      </div>

      {/* Booking modal triggered from chat tool card ──────────────────────── */}
      <BookingModal
        restaurant={bookingRestaurant}
        isOpen={!!bookingRestaurantId}
        onClose={() => setBookingRestaurantId(null)}
      />
    </>
  );
}
