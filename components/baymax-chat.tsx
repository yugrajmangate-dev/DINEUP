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
  ChefHat,
} from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";

import type { GeolocationStatus } from "@/hooks/use-geolocation";
import type { UserLocation } from "@/lib/geo";
import { restaurants } from "@/lib/restaurants";
import { BookingModal } from "@/components/booking-modal";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Starter message ──────────────────────────────────────────────────────────

const STARTER_ID = "baymax-intro";

const starterBubble: UIMessage = {
  id: STARTER_ID,
  role: "assistant",
  parts: [{ type: "text", text: "Hello! I am Baymax — your personal dining concierge. Tell me what you are craving tonight and I will find the perfect table." }],
};

// ─── Tool badge ───────────────────────────────────────────────────────────────

function ToolCallingBadge({ toolName }: { toolName: string }) {
  const label =
    toolName === "checkAvailability" ? "Checking availability…"
    : toolName === "initiateBooking" ? "Loading booking card…"
    : `Running ${toolName}…`;

  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-2.5 rounded-2xl border border-orange-100 bg-orange-50 px-4 py-2.5 text-xs font-medium text-orange-600">
        <motion.span
          className="h-2 w-2 rounded-full bg-[#FF6B35]"
          animate={{ scale: [1, 1.5, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.2, repeat: Number.POSITIVE_INFINITY }}
        />
        {label}
      </div>
    </div>
  );
}

// ─── Availability card ────────────────────────────────────────────────────────

function AvailabilityResultCard({ result }: { result: Record<string, unknown> }) {
  const available = result.available as boolean;
  const message = result.message as string;
  return (
    <div className="flex justify-start">
      <div className={cn(
        "flex max-w-[88%] items-start gap-2.5 rounded-2xl border px-4 py-3 text-sm leading-relaxed",
        available ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-red-200 bg-red-50 text-red-700",
      )}>
        {available
          ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
          : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
        <span>{message}</span>
      </div>
    </div>
  );
}

// ─── Booking card ─────────────────────────────────────────────────────────────

function BookingCard({ result, onBook }: { result: Record<string, unknown>; onBook: (id: string) => void }) {
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
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-[92%] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      >
        {/* Card header */}
        <div className="bg-gradient-to-r from-[#FF6B35] to-[#FF4F5A] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{cuisine}</p>
              <p className="mt-0.5 font-semibold text-white">{restaurantName}</p>
            </div>
            <span className="mt-0.5 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-white text-white" />{rating.toFixed(1)}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{neighborhood}</span>
            <span>{price}</span>
          </div>
        </div>

        {/* Time slots */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">Available tonight</p>
          <div className="flex flex-wrap gap-1.5">
            {slots.map((slot) => (
              <span key={slot} className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Clock className="h-3 w-3 text-[#FF6B35]" />{slot}
              </span>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="px-4 pb-4">
          <button
            type="button"
            onClick={() => onBook(restaurantId)}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)] hover:shadow-[0_8px_24px_rgba(255,107,53,0.4)] active:scale-[0.98] transition-all"
          >
            <CalendarCheck className="h-4 w-4" />Reserve table
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

// ─── Main component ───────────────────────────────────────────────────────────

export function BaymaxChat({ userLocation, locationStatus }: BaymaxChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [bookingRestaurantId, setBookingRestaurantId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const quickPrompts = useMemo(() => [
    "Great dinner nearby",
    "Reserve Terra Bloom",
    "Is Cinder House free?",
  ], []);

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { error, messages, sendMessage, status } = useChat({
    transport,
    experimental_throttle: 40,
  });

  const allMessages = useMemo(() => [starterBubble, ...messages], [messages]);
  const isThinking = status === "submitted" || status === "streaming";

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [allMessages, isThinking]);

  const submitMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;
    setInput("");
    setIsOpen(true);
    await sendMessage({ text: trimmed }, { body: { userLocation } });
  };

  const bookingRestaurant = useMemo(
    () => restaurants.find((r) => r.id === bookingRestaurantId) ?? null,
    [bookingRestaurantId],
  );

  return (
    <>
      <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-3">
        {/* ── Chat window ─────────────────────────────────────────────────── */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="flex w-[min(400px,calc(100vw-2rem))] flex-col overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]"
              style={{ maxHeight: "min(600px, calc(100vh - 6rem))" }}
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-gradient-to-br from-[#FF6B35] to-[#FF4F5A] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Baymax</p>
                    <p className="text-xs text-white/70">
                      {locationStatus === "ready" ? "📍 Location-aware concierge" : "AI Dining Concierge"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white hover:bg-white/25 active:scale-95 transition-all"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-3 overflow-y-auto px-4 py-4"
                style={{ maxHeight: "340px" }}
              >
                {allMessages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    {(message.parts as MessagePart[]).map((part, idx) => {
                      if (part.type === "text" && part.text.trim()) {
                        return (
                          <div key={idx} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                              message.role === "user"
                                ? "bg-gradient-to-br from-[#FF6B35] to-[#FF4F5A] text-white shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
                                : "bg-gray-100 text-slate-800",
                            )}>
                              {part.text}
                            </div>
                          </div>
                        );
                      }
                      if (part.type === "tool-call") {
                        const hasResult = (message.parts as MessagePart[]).some(
                          (p) => p.type === "tool-result" && (p as ToolResultPart).toolCallId === part.toolCallId,
                        );
                        if (hasResult) return null;
                        return <ToolCallingBadge key={idx} toolName={part.toolName} />;
                      }
                      if (part.type === "tool-result") {
                        if (part.toolName === "checkAvailability") {
                          return <AvailabilityResultCard key={idx} result={part.result} />;
                        }
                        if (part.toolName === "initiateBooking" && !part.result.error) {
                          return <BookingCard key={idx} result={part.result} onBook={setBookingRestaurantId} />;
                        }
                      }
                      return null;
                    })}
                  </div>
                ))}

                {error && (
                  <div className="flex justify-start">
                    <div className="max-w-[84%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      Connection issue. Please try again.
                    </div>
                  </div>
                )}

                <AnimatePresence>
                  {isThinking && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      className="flex justify-start"
                    >
                      <div className="flex items-center gap-1.5 rounded-2xl bg-gray-100 px-4 py-3">
                        {[0, 1, 2].map((i) => (
                          <motion.span
                            key={i}
                            className="h-2 w-2 rounded-full bg-slate-400"
                            animate={{ y: [0, -6, 0] }}
                            transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.15 }}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Quick prompts + input */}
              <div className="border-t border-gray-100 px-4 py-3">
                <div className="mb-2.5 flex flex-wrap gap-1.5">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => void submitMessage(prompt)}
                      className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 transition-all"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
                <form onSubmit={(e) => { e.preventDefault(); void submitMessage(input); }} className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-[#FF6B35] focus-within:bg-white transition-all">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FF6B35]" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask for a perfect table…"
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!input.trim() || isThinking}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B35] text-white shadow-[0_4px_16px_rgba(255,107,53,0.35)] hover:shadow-[0_8px_24px_rgba(255,107,53,0.45)] active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── FAB ─────────────────────────────────────────────────────────── */}
        <motion.button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          whileTap={{ scale: 0.94 }}
          whileHover={{ scale: 1.06 }}
          className="relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-gradient-to-br from-[#FF6B35] to-[#FF4F5A] text-white shadow-[0_8px_32px_rgba(255,107,53,0.45)] transition-shadow hover:shadow-[0_12px_40px_rgba(255,107,53,0.55)]"
        >
          {/* Pulse ring */}
          <motion.span
            className="absolute inset-0 rounded-[22px] border-2 border-[#FF6B35]"
            animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.span key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <X className="h-6 w-6" />
              </motion.span>
            ) : (
              <motion.span key="bot" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                <Bot className="h-6 w-6" />
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>

      <BookingModal
        restaurant={bookingRestaurant}
        isOpen={!!bookingRestaurantId}
        onClose={() => setBookingRestaurantId(null)}
      />
    </>
  );
}
