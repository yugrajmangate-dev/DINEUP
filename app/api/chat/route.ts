import { createOpenAI } from "@ai-sdk/openai";
import {
  convertToModelMessages,
  streamText,
  tool,
  type UIMessage,
} from "ai";
import { z } from "zod";

import type { UserLocation } from "@/lib/geo";
import { restaurants } from "@/lib/restaurants";
import {
  checkAvailability,
  getRestaurants,
} from "@/lib/mock-db";

export const maxDuration = 45;
const MAX_MODEL_MESSAGES = 14;

// ─── System prompt ────────────────────────────────────────────────────────────

function buildInventoryContext() {
  const dbRestaurants = getRestaurants();
  const merged = restaurants.map((restaurant) => {
    const live = dbRestaurants.find((item) => item.id === restaurant.id);
    return {
      id: restaurant.id,
      name: restaurant.name,
      cuisine: restaurant.cuisine,
      neighborhood: restaurant.neighborhood,
      price: restaurant.price,
      rating: restaurant.rating,
      operating_hours: live?.operating_hours ?? "Not specified",
      available_slots: live?.available_slots ?? [],
    };
  });

  // Keep inventory compact to reduce prompt token usage on each request.
  return JSON.stringify(merged);
}

function formatLocationContext(userLocation: UserLocation | null | undefined) {
  if (!userLocation) {
    return "The user has not shared a live location yet. Ask for their neighborhood or preferred distance when relevant.";
  }
  return `The user is currently near latitude ${userLocation.latitude.toFixed(5)}, longitude ${userLocation.longitude.toFixed(5)} with ~${Math.round(userLocation.accuracy)} m accuracy.`;
}

function createSystemPrompt(userLocation: UserLocation | null | undefined) {
  return [
    "You are Baymax, an elite but practical dining copilot for DineUp.",
    "Be concise, accurate, and action-oriented. Avoid fluff, repetition, and generic assistant wording.",
    "Response length rule: max 2 short lines unless user explicitly asks for details.",
    "Use very short sentences (prefer <= 14 words each).",
    "Primary objective: help users discover, check availability, and complete reservations with minimal back-and-forth.",
    "Use ONLY the inventory provided below. Never invent restaurants, slots, or booking confirmations.",
    "Think and act like an agent:",
    "1) Detect user intent (discover, availability check, booking).",
    "2) Collect missing mandatory booking fields (restaurant, date, time, party size).",
    "3) Call the right tool at the right time.",
    "4) If details are missing, ask ONLY for the missing fields.",
    "5) Once all details are present, move to payment-option choice and confirmation flow.",
    "Tool policy:",
    "• Use `checkAvailability` for availability queries and when user asks if a specific slot is free.",
    "• Use `initiateBooking` when booking intent exists OR user asks to reserve.",
    "• Do not claim availability or confirmation without tool output.",
    "Conversation policy:",
    "• Maintain context across turns (restaurant, date, time, party size, preferences).",
    "• Prefer one clear next question when required.",
    "• If user gives partial info, acknowledge and request the exact remaining fields.",
    "• If user asks for options, provide 2-4 tailored options based on known constraints (location, cuisine, budget, time).",
    "• If the user sounds hungry/urgent, prioritize immediate options and ask one direct next-step question.",
    "Formatting policy:",
    "• Keep responses plain text without markdown styling (no **bold**, no code fences).",
    "• Keep recommendation answers short: 1-2 compact lines.",
    "Time and date policy:",
    "• Normalize time to HH:mm when calling tools.",
    "• Never use past dates/times.",
    "• For partial dates (e.g. 29 January), infer nearest future valid date.",
    "• If date/time is invalid or in the past, request corrected future value.",
    "Payment flow policy:",
    "• Before final confirmation, present both options:",
    "  - Pay now (coming soon)",
    "  - Book now, pay at venue",
    "• Finalize only after user chooses an option.",
    formatLocationContext(userLocation),
    "\nRestaurant inventory:\n" + buildInventoryContext(),
  ].join("\n\n");
}

function estimatePerGuest(price: string) {
  if (price === "₹") return 450;
  if (price === "₹₹") return 900;
  if (price === "₹₹₹") return 1600;
  return 2400;
}

function humanizeMissingFields(missingFields: string[]) {
  const labels: Record<string, string> = {
    restaurantId: "restaurant",
    date: "date",
    time: "time",
    partySize: "party size",
  };

  return missingFields.map((field) => labels[field] ?? field);
}

const BOOKING_TIME_ZONE = "Asia/Kolkata";

type ZonedNow = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
};

function getZonedNow(timeZone: string): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return {
    year: Number.parseInt(map.year, 10),
    month: Number.parseInt(map.month, 10),
    day: Number.parseInt(map.day, 10),
    hour: Number.parseInt(map.hour, 10),
    minute: Number.parseInt(map.minute, 10),
  };
}

function asDateOnly(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function parseIsoDate(date: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  const [year, month, day] = date.split("-").map((value) => Number.parseInt(value, 10));
  const parsed = new Date(year, month - 1, day);

  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== year
    || parsed.getMonth() !== month - 1
    || parsed.getDate() !== day
  ) {
    return null;
  }

  parsed.setHours(0, 0, 0, 0);
  return parsed;
}

function parseTimeToMinutes(time: string) {
  const value = time.trim().toLowerCase();

  const twentyFour = value.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hour = Number.parseInt(twentyFour[1], 10);
    const minute = Number.parseInt(twentyFour[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return {
      minutes: hour * 60 + minute,
      normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
    };
  }

  const twelveHour = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!twelveHour) return null;

  const rawHour = Number.parseInt(twelveHour[1], 10);
  const minute = Number.parseInt(twelveHour[2] ?? "00", 10);
  const meridiem = twelveHour[3];

  if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) return null;

  const baseHour = rawHour % 12;
  const hour = meridiem === "pm" ? baseHour + 12 : baseHour;

  return {
    minutes: hour * 60 + minute,
    normalized: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
  };
}

function formatIsoDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nextFutureDateSuggestion(reference: Date, originalDate: Date) {
  const now = new Date(reference);
  now.setHours(0, 0, 0, 0);

  let suggested = new Date(now.getFullYear(), originalDate.getMonth(), originalDate.getDate());
  suggested.setHours(0, 0, 0, 0);

  if (suggested <= now) {
    suggested = new Date(now.getFullYear() + 1, originalDate.getMonth(), originalDate.getDate());
    suggested.setHours(0, 0, 0, 0);
  }

  return suggested;
}

function parseNaturalDate(input: string, zonedNow: ZonedNow) {
  const normalized = input
    .trim()
    .toLowerCase()
    .replace(/,/g, " ")
    .replace(/\b(\d{1,2})(st|nd|rd|th)\b/g, "$1")
    .replace(/\s+/g, " ");

  const monthMap: Record<string, number> = {
    january: 0, jan: 0,
    february: 1, feb: 1,
    march: 2, mar: 2,
    april: 3, apr: 3,
    may: 4,
    june: 5, jun: 5,
    july: 6, jul: 6,
    august: 7, aug: 7,
    september: 8, sep: 8, sept: 8,
    october: 9, oct: 9,
    november: 10, nov: 10,
    december: 11, dec: 11,
  };

  const dayMonth = normalized.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
  const monthDay = normalized.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/);

  const day = dayMonth ? Number.parseInt(dayMonth[1], 10) : monthDay ? Number.parseInt(monthDay[2], 10) : null;
  const monthText = dayMonth ? dayMonth[2] : monthDay ? monthDay[1] : null;
  const explicitYear = dayMonth
    ? dayMonth[3]
    : monthDay
      ? monthDay[3]
      : undefined;

  if (!day || !monthText || !(monthText in monthMap)) return null;

  const month = monthMap[monthText];
  const hasExplicitYear = typeof explicitYear === "string";
  const year = hasExplicitYear ? Number.parseInt(explicitYear as string, 10) : zonedNow.year;

  let parsed = new Date(year, month, day);
  if (
    Number.isNaN(parsed.getTime())
    || parsed.getFullYear() !== year
    || parsed.getMonth() !== month
    || parsed.getDate() !== day
  ) {
    return null;
  }

  parsed = asDateOnly(parsed);

  if (!hasExplicitYear) {
    const today = asDateOnly(new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day));
    if (parsed < today) {
      parsed = asDateOnly(new Date(zonedNow.year + 1, month, day));
    }
  }

  return parsed;
}

function validateDateAndTime(date: string | undefined, time: string | undefined) {
  const zonedNow = getZonedNow(BOOKING_TIME_ZONE);
  const nowDate = new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day, zonedNow.hour, zonedNow.minute);
  const today = asDateOnly(new Date(zonedNow.year, zonedNow.month - 1, zonedNow.day));

  let parsedDate: Date | null = null;
  let normalizedDate: string | undefined;
  if (date) {
    parsedDate = parseIsoDate(date) ?? parseNaturalDate(date, zonedNow);
    if (!parsedDate) {
      return {
        ok: false,
        issue: "date" as const,
        message: "Please provide a valid date, for example 2026-03-25 or 25 March.",
      };
    }

    normalizedDate = formatIsoDate(parsedDate);

    if (parsedDate < today) {
      const suggestion = nextFutureDateSuggestion(nowDate, parsedDate);
      return {
        ok: false,
        issue: "date" as const,
        message: `That date is in the past. Please choose a future date, for example ${formatIsoDate(suggestion)}.`,
      };
    }
  }

  let normalizedTime: string | undefined;
  if (time) {
    const parsedTime = parseTimeToMinutes(time);
    if (!parsedTime) {
      return {
        ok: false,
        issue: "time" as const,
        message: "Please provide a valid time like 20:00 or 8:00 PM.",
      };
    }

    normalizedTime = parsedTime.normalized;

    if (parsedDate && parsedDate.getTime() === today.getTime()) {
      const nowMinutes = zonedNow.hour * 60 + zonedNow.minute;
      if (parsedTime.minutes <= nowMinutes) {
        return {
          ok: false,
          issue: "time" as const,
          message: "That time has already passed today. Please choose a later time.",
        };
      }
    }
  }

  return {
    ok: true,
    normalizedDate,
    normalizedTime,
  };
}

function slugifyRestaurantInput(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function resolveRestaurantIdentifier(input: string) {
  const raw = input.trim();
  const lowered = raw.toLowerCase();
  const slug = slugifyRestaurantInput(raw);

  return restaurants.find((restaurant) =>
    restaurant.id === raw
    || restaurant.id.toLowerCase() === lowered
    || restaurant.name.toLowerCase() === lowered
    || slugifyRestaurantInput(restaurant.name) === slug
  ) ?? null;
}

function normalizeMessagesForModel(messages: UIMessage[]): UIMessage[] {
  const validRoles = new Set(["user", "assistant", "system"]);

  const cleaned = messages
    .filter((message) =>
      message.id !== "intro"
      && message.id !== "baymax-intro"
      && validRoles.has(message.role)
    )
    .map((message) => {
      const textParts = (message.parts ?? []).filter(
        (part): part is Extract<(typeof message.parts)[number], { type: "text" }> =>
          part.type === "text" && typeof part.text === "string" && part.text.trim().length > 0,
      );

      return {
        ...message,
        parts: textParts,
      };
    })
    .filter((message) => message.parts.length > 0);

  // Keep only the latest window of messages to control token growth.
  return cleaned.slice(-MAX_MODEL_MESSAGES);
}

function parseRetryAfterSecondsFromMessage(message: string) {
  const match = message.match(/try again in\s+([0-9]+)m([0-9]+(?:\.[0-9]+)?)s/i);
  if (!match) return undefined;

  const minutes = Number.parseInt(match[1], 10);
  const seconds = Number.parseFloat(match[2]);

  if (Number.isNaN(minutes) || Number.isNaN(seconds)) return undefined;
  return Math.ceil(minutes * 60 + seconds);
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error && typeof error.message === "string") {
    return error.message;
  }
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string") return message;
  }
  return "Unknown model error";
}

function isRateLimitError(error: unknown) {
  const message = getErrorMessage(error).toLowerCase();
  return message.includes("rate limit") || message.includes("429") || message.includes("tokens per day");
}

type ProviderConfig = {
  providerName: "groq" | "minimax";
  client: ReturnType<typeof createOpenAI>;
  modelCandidates: string[];
};

function parseEnvModelList(value: string | undefined) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildGroqProviderConfig(): ProviderConfig | null {
  if (!process.env.GROQ_API_KEY) return null;

  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
  });

  const primary = process.env.GROQ_MODEL?.trim() || "llama-3.3-70b-versatile";
  const envFallbacks = parseEnvModelList(process.env.GROQ_FALLBACK_MODELS);
  const defaultFallbacks = ["llama-3.1-8b-instant", "openai/gpt-oss-20b"];

  return {
    providerName: "groq",
    client: groq,
    modelCandidates: Array.from(new Set([primary, ...envFallbacks, ...defaultFallbacks])),
  };
}

function buildMiniMaxProviderConfig(): ProviderConfig | null {
  if (!process.env.MINIMAX_API_KEY) return null;

  const minimax = createOpenAI({
    baseURL: process.env.MINIMAX_BASE_URL ?? "https://api.minimax.chat/v1",
    apiKey: process.env.MINIMAX_API_KEY,
  });

  const primary = process.env.MINIMAX_MODEL?.trim() || "MiniMax-M1";
  const fallback = parseEnvModelList(process.env.MINIMAX_FALLBACK_MODELS);

  return {
    providerName: "minimax",
    client: minimax,
    modelCandidates: Array.from(new Set([primary, ...fallback])),
  };
}

function getProviderConfigs(): ProviderConfig[] {
  const selectedProvider = (process.env.AI_PROVIDER ?? "groq").trim().toLowerCase();

  const groqConfig = buildGroqProviderConfig();
  const minimaxConfig = buildMiniMaxProviderConfig();

  const ordered: ProviderConfig[] = [];

  if (selectedProvider === "minimax") {
    if (minimaxConfig) ordered.push(minimaxConfig);
    if (groqConfig) ordered.push(groqConfig);
    return ordered;
  }

  if (selectedProvider === "groq") {
    if (groqConfig) ordered.push(groqConfig);
    if (minimaxConfig) ordered.push(minimaxConfig);
    return ordered;
  }

  // Unknown value: fall back to any configured providers.
  if (groqConfig) ordered.push(groqConfig);
  if (minimaxConfig) ordered.push(minimaxConfig);
  return ordered;
}

// ─── Tools ────────────────────────────────────────────────────────────────────

const appTools = {
  checkAvailability: tool({
    description:
      "Check whether a restaurant has table availability on a specific date and time. Call this when the user asks about availability before committing to a booking.",
    inputSchema: z.object({
      restaurantId: z.string().describe("The `id` field of the restaurant from the inventory."),
      date: z
        .string()
        .optional()
        .describe("The requested date in YYYY-MM-DD format, e.g. '2026-03-08'."),
      time: z
        .string()
        .describe("The requested time slot, preferably in HH:mm (24-hour) e.g. '20:00'."),
    }),
    execute: async ({ restaurantId, date, time }) => {
      const dateTimeValidation = validateDateAndTime(date, time);
      const normalizedDate = dateTimeValidation.ok ? dateTimeValidation.normalizedDate : date;
      const normalizedTime = dateTimeValidation.ok ? dateTimeValidation.normalizedTime : time;
      if (!dateTimeValidation.ok) {
        return {
          ok: false,
          available: false,
          restaurantId,
          requestedSlot: normalizedTime,
          remainingSlots: [] as string[],
          error: dateTimeValidation.message,
          message: dateTimeValidation.message,
          date: normalizedDate ?? null,
          time: normalizedTime,
        };
      }

      const restaurant = resolveRestaurantIdentifier(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          available: false,
          restaurantId,
          requestedSlot: normalizedTime,
          remainingSlots: [] as string[],
          error: `Restaurant '${restaurantId}' not found.`,
          message: `I couldn’t match '${restaurantId}' to a restaurant in DineUp. Please try the restaurant name again.`,
          date: normalizedDate ?? null,
          time: normalizedTime,
        };
      }

      const result = checkAvailability(restaurant.id, normalizedTime as string);
      return {
        ...result,
        date: normalizedDate ?? null,
        time: normalizedTime,
        message: result.ok
          ? result.available
            ? `${result.restaurantName} is available${normalizedDate ? ` on ${normalizedDate}` : ""} at ${result.requestedSlot}.`
            : `${result.restaurantName} is full${normalizedDate ? ` on ${normalizedDate}` : ""} at ${result.requestedSlot}. Try: ${result.remainingSlots.join(", ") || "other restaurants"}.`
          : result.message,
      };
    },
  }),

  initiateBooking: tool({
    description:
      "Prepare an interactive booking draft card in the chat. Use this only after collecting details from the user. If details are missing, return exactly which fields are still required. Include pre-booking payment options before final confirmation.",
    inputSchema: z.object({
      restaurantId: z
        .string()
        .optional()
        .describe("The `id` field of the restaurant the user wants to book."),
      time: z
        .string()
        .optional()
        .describe("Requested reservation time in HH:mm where possible, e.g. '20:00'."),
      partySize: z
        .number()
        .int()
        .min(1)
        .max(12)
        .optional()
        .describe("How many guests are included in the booking."),
      date: z
        .string()
        .optional()
        .describe("Optional requested date in YYYY-MM-DD format."),
    }),
    execute: async ({ restaurantId, time, partySize, date }) => {
      const requestedTime = typeof time === "string"
        ? (parseTimeToMinutes(time)?.normalized ?? time)
        : undefined;
      const resolvedRestaurant = restaurantId
        ? resolveRestaurantIdentifier(restaurantId)
        : null;

      const missingFields: string[] = [];
      if (!restaurantId) missingFields.push("restaurantId");
      if (!date) missingFields.push("date");
      if (!time) missingFields.push("time");
      if (!partySize) missingFields.push("partySize");

      if (missingFields.length > 0) {
        const readable = humanizeMissingFields(missingFields);
        return {
          ok: true,
          booked: false,
          readyForConfirmation: false,
          requiresDetails: true,
          restaurantId: resolvedRestaurant?.id ?? restaurantId,
          restaurantName: resolvedRestaurant?.name,
          neighborhood: resolvedRestaurant?.neighborhood,
          cuisine: resolvedRestaurant?.cuisine,
          rating: resolvedRestaurant?.rating,
          price: resolvedRestaurant?.price,
          requestedSlot: requestedTime,
          partySize,
          date: date ?? null,
          slots: [] as string[],
          missingFields,
          missingFieldLabels: readable,
          bookingMessage: `Ready to book. Please share: ${readable.join(", ")}.`,
          paymentOptions: [
            { id: "pay-now", label: "Pay now", status: "coming_soon" },
            { id: "pay-later", label: "Book now, pay at venue", status: "available" },
          ],
        };
      }

      const dateTimeValidation = validateDateAndTime(date, time);
      const normalizedDate = dateTimeValidation.ok ? dateTimeValidation.normalizedDate : date;
      const normalizedTime = dateTimeValidation.ok ? dateTimeValidation.normalizedTime : time;
      if (!dateTimeValidation.ok) {
        const missingIssue = dateTimeValidation.issue as string;
        return {
          ok: true,
          booked: false,
          readyForConfirmation: false,
          requiresDetails: true,
          restaurantId,
          requestedSlot: normalizedTime,
          partySize,
          date: normalizedDate,
          slots: [] as string[],
          bookingMessage: dateTimeValidation.message,
          missingFields: [missingIssue],
          missingFieldLabels: humanizeMissingFields([missingIssue]),
        };
      }

      const restaurant = resolveRestaurantIdentifier(restaurantId as string);
      if (!restaurant) {
        return {
          ok: false,
          booked: false,
          restaurantId,
          requestedSlot: normalizedTime,
          partySize,
          slots: [] as string[],
          error: `Restaurant '${restaurantId}' not found.`,
          bookingMessage: `I couldn’t match '${restaurantId}' to a restaurant in DineUp. Please try again with the restaurant name.`,
          requiresDetails: true,
          readyForConfirmation: false,
        };
      }

      const availability = checkAvailability(restaurant.id, normalizedTime as string);
      if (!availability.ok) {
        return {
          ok: false,
          booked: false,
          readyForConfirmation: false,
          requiresDetails: true,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          requestedSlot: normalizedTime,
          partySize,
          date: normalizedDate,
          slots: [] as string[],
          bookingMessage: availability.message,
          error: availability.message,
        };
      }

      if (!availability.available) {
        return {
          ok: true,
          booked: false,
          readyForConfirmation: false,
          requiresDetails: true,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          requestedSlot: availability.requestedSlot,
          partySize,
          date: normalizedDate,
          slots: availability.remainingSlots,
          bookingMessage: `${restaurant.name} is unavailable at ${availability.requestedSlot}. Pick another time.`,
          missingFields: ["time"],
          missingFieldLabels: ["time"],
        };
      }

      const perGuest = estimatePerGuest(restaurant.price);
      const subtotal = perGuest * (partySize as number);
      const prebookingAmount = Math.round(subtotal * 0.2);

      return {
        ok: true,
        booked: false,
        readyForConfirmation: true,
        requiresDetails: false,
        bookingMessage: `Table ready: ${restaurant.name}, ${availability.requestedSlot}, ${partySize} guests. Choose payment option.`,
        requestedSlot: availability.requestedSlot,
        partySize,
        date: normalizedDate ?? null,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        neighborhood: restaurant.neighborhood,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        price: restaurant.price,
        slots: availability.remainingSlots,
        address: restaurant.address,
        image: restaurant.image,
        estimatedSubtotal: subtotal,
        prebookingAmount,
        paymentOptions: [
          {
            id: "pay-now",
            label: "Pay now",
            status: "coming_soon",
            note: "Online prepayment gateway will be integrated soon.",
          },
          {
            id: "pay-later",
            label: "Book now, pay at venue",
            status: "available",
            note: "Reservation is confirmed now. Settle payment at the restaurant.",
          },
        ],
      };
    },
  }),
};

// ─── Route ────────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  const providerConfigs = getProviderConfigs();
  if (providerConfigs.length === 0) {
    return Response.json(
      {
        error: "Missing AI provider configuration. Set AI_PROVIDER and matching API key in .env.local.",
      },
      { status: 500 },
    );
  }

  let requestBody: {
    messages: UIMessage[];
    userLocation?: UserLocation | null;
  };

  try {
    requestBody = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid request payload for Baymax chat." },
      { status: 400 },
    );
  }

  const { messages, userLocation } = requestBody;

  // Strip UI-only / synthetic messages that are not valid model messages.
  // The intro assistant message injected on the client has id="intro" and
  // must not be forwarded to the model (it causes a validation error).
  const safeMessages = normalizeMessagesForModel(messages);
  const modelMessages = await convertToModelMessages(safeMessages);
  let lastError: unknown;
  let lastProviderName: ProviderConfig["providerName"] = "groq";
  let sawRateLimit = false;

  for (const providerConfig of providerConfigs) {
    const { providerName, client, modelCandidates } = providerConfig;
    lastProviderName = providerName;

    for (const modelName of modelCandidates) {
      try {
        const result = streamText({
          model: client(modelName),
          system: createSystemPrompt(userLocation),
          messages: modelMessages,
          tools: appTools,
          temperature: 0.35,
        });

        return result.toUIMessageStreamResponse();
      } catch (error: unknown) {
        lastError = error;

        // If this is not rate-limiting, stop failover and return immediately.
        if (!isRateLimitError(error)) {
          break;
        }

        sawRateLimit = true;
        console.warn(`[Chat API] ${providerName} model '${modelName}' rate-limited. Trying fallback model...`);
      }
    }

    // Stop after non-rate-limit errors from this provider.
    if (lastError && !isRateLimitError(lastError)) break;
  }

  try {
    throw lastError;
  } catch (error: unknown) {
    // Deep-log the full error so we can diagnose Groq / SDK issues in the
    // Vercel / Next.js server console without losing stack / cause details.
    console.error(
      `[Chat API] ${lastProviderName.toUpperCase()} FULL ERROR DETAILS:`,
      JSON.stringify(
        error,
        // JSON.stringify skips non-enumerable Error properties; handle them explicitly
        (key, value) => {
          if (value instanceof Error) {
            return {
              name: value.name,
              message: value.message,
              stack: value.stack,
              cause: value.cause,
            };
          }
          return value;
        },
        2
      )
    );
    console.error("[Chat API] raw error object:", error);

    if (sawRateLimit || isRateLimitError(error)) {
      const message = getErrorMessage(error);
      const retryAfter = parseRetryAfterSecondsFromMessage(message);
      return Response.json(
        {
          error: "Baymax has temporarily reached provider token limits. Please retry shortly.",
          retryAfterSeconds: retryAfter,
        },
        { status: 429 },
      );
    }

    return Response.json(
      { error: `Failed to communicate with ${lastProviderName} model provider.` },
      { status: 500 }
    );
  }
}
