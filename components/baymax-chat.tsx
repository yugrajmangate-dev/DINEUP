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

// ─── Starter messages ─────────────────────────────────────────────────────────

const starterMessages: UIMessage[] = [
  {
    id: "intro",
    role: "assistant",
    parts: [
      {
        type: "text",
        text: "Hello. I am Baymax. Where are we dining tonight?",
      },
    ],
  },
];

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
      <div className="flex items-center gap-2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2.5 text-xs text-zinc-400 shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
        <motion.span
          className="h-2 w-2 rounded-full bg-accent"
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
          "max-w-[90%] rounded-3xl border px-4 py-3.5 text-sm leading-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)]",
          available
            ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
            : "border-red-400/20 bg-red-500/10 text-red-200",
        )}
      >
        <div className="flex items-start gap-2">
          {available ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
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
        className="max-w-[90%] overflow-hidden rounded-3xl border border-white/10 bg-zinc-900 shadow-[0_16px_40px_rgba(0,0,0,0.35)]"
      >
        {/* Header */}
        <div className="border-b border-white/8 px-4 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">{cuisine}</p>
              <p className="mt-0.5 font-semibold text-white">{restaurantName}</p>
            </div>
            <div className="flex items-center gap-1 rounded-full border border-white/8 bg-white/5 px-2.5 py-1.5 text-xs text-white">
              <Star className="h-3 w-3 fill-accent text-accent" />
              {rating.toFixed(1)}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" /> {neighborhood}
            </span>
            <span>{price}</span>
          </div>
        </div>

        {/* Time slots */}
        <div className="px-4 py-3">
          <p className="mb-2 text-xs uppercase tracking-[0.2em] text-zinc-500">Available tonight</p>
          <div className="flex flex-wrap gap-2">
            {slots.map((slot) => (
              <span
                key={slot}
                className="flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300"
              >
                <Clock className="h-3 w-3 text-accent" />
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
            className="flex w-full items-center justify-center gap-2 rounded-full bg-accent py-2.5 text-sm font-semibold text-black shadow-[0_8px_30px_rgba(255,107,107,0.24)] transition-all hover:shadow-[0_14px_40px_rgba(255,107,107,0.3)] active:scale-95"
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
    messages: starterMessages,
    experimental_throttle: 40,
  });

  const isThinking = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, isThinking]);

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
              className="w-[min(420px,calc(100vw-1.5rem))] overflow-hidden rounded-4xl border border-white/10 bg-black/50 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              {/* Header ──────────────────────────────────────────────────── */}
              <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-accent/15 text-accent shadow-[0_0_28px_rgba(255,107,107,0.35)]">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-white">Baymax</p>
                    <p className="text-sm text-zinc-400">AI Gastronomy Assistant · Tool-enabled</p>
                    <div className="mt-1 inline-flex items-center gap-1 text-xs text-zinc-500">
                      <MapPin className="h-3 w-3" />
                      {locationStatus === "ready"
                        ? "Location-aware recommendations enabled"
                        : "Working from your preferences until location is shared"}
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-10 w-10 items-center justify-center rounded-full border border-white/8 bg-white/5 text-zinc-300 hover:bg-white/10 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages ────────────────────────────────────────────────── */}
              <div
                ref={scrollRef}
                className="max-h-105 space-y-3 overflow-y-auto px-5 py-5"
              >
                {messages.map((message) => (
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
                                "max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-[0_10px_30px_rgba(0,0,0,0.24)]",
                                message.role === "user"
                                  ? "bg-accent text-black"
                                  : "bg-zinc-900 text-zinc-200",
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
                    <div className="max-w-[85%] rounded-3xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-200">
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
                      <div className="flex items-center gap-1 rounded-full bg-zinc-900 px-4 py-3 text-zinc-300 shadow-[0_10px_30px_rgba(0,0,0,0.24)]">
                        {[0, 1, 2].map((dot) => (
                          <motion.span
                            key={dot}
                            className="h-2 w-2 rounded-full bg-zinc-500"
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
              <div className="border-t border-white/8 px-5 py-4">
                <div className="mb-3 flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitMessage(prompt)}
                      className="rounded-full border border-white/8 bg-white/5 px-3 py-2 text-xs text-zinc-300 hover:border-accent/30 hover:bg-accent/10 hover:text-white active:scale-95"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => void handleSubmit(e)} className="flex items-center gap-3">
                  <div className="flex flex-1 items-center gap-3 rounded-full border border-white/10 bg-black/40 px-4 py-3">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask Baymax for a perfect table…"
                      className="w-full bg-transparent text-sm text-white outline-none placeholder:text-zinc-500"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-black shadow-[0_12px_40px_rgba(255,107,107,0.3)] hover:shadow-[0_18px_50px_rgba(255,107,107,0.34)] active:scale-95"
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
          className="relative flex h-16 w-16 items-center justify-center rounded-full bg-accent text-black shadow-[0_18px_60px_rgba(255,107,107,0.35)] transition-all"
        >
          <motion.span 
            className="absolute inset-0 rounded-full bg-accent/40 blur-2xl"
            animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.8, 0.6] }}
            transition={{ duration: 3, repeat: Number.POSITIVE_INFINITY }}
          />
          <span className="absolute -inset-1.5 rounded-full border border-accent/20" />
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
