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

  return JSON.stringify(merged, null, 2);
}

function formatLocationContext(userLocation: UserLocation | null | undefined) {
  if (!userLocation) {
    return "The user has not shared a live location yet. Ask for their neighborhood or preferred distance when relevant.";
  }
  return `The user is currently near latitude ${userLocation.latitude.toFixed(5)}, longitude ${userLocation.longitude.toFixed(5)} with ~${Math.round(userLocation.accuracy)} m accuracy.`;
}

function createSystemPrompt(userLocation: UserLocation | null | undefined) {
  return [
    "You are Baymax, an elite, minimalist AI gastronomy assistant for DineUp.",
    "Your tone is extremely concise, polite, sophisticated, and discerning (like a high-end concierge). DO NOT give long introductory or conversational filler. Get straight to the point.",
    "Behave like an agent, not a Q&A bot: drive the booking workflow step-by-step.",
    "Use ONLY the restaurant inventory provided below.",
    "When recommending a place, use only 1 or 2 short sentences. Mention dietary tags or cuisine organically.",
    "You have two tools available:",
    "• Use `checkAvailability` when the user asks if a specific restaurant has tables free.",
    "• Use `initiateBooking` when the user explicitly says they want to book or reserve.",
    "Mandatory booking fields before confirmation: restaurant, date, time, and party size.",
    "If any mandatory field is missing, ask only for the missing fields and do not finalize.",
    "When all fields are present, present pre-booking payment options before confirmation:",
    "• Pay now (coming soon)",
    "• Book now, pay at venue",
    "Only after the user chooses one option should you proceed to final confirmation.",
    "If the user mentions a restaurant by name, convert it to the matching inventory id before calling a tool.",
    "Always pass booking/check times in 24-hour HH:mm format when possible (e.g. 20:00).",
    "Never use past dates or past times. If a user asks with only day/month (e.g. 29 January), infer the nearest future valid date.",
    "If the provided date/time is in the past, ask for a corrected future date/time before proceeding.",
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
  const match = time.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;

  const hour = Number.parseInt(match[1], 10);
  const minute = Number.parseInt(match[2], 10);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

  return hour * 60 + minute;
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

function validateDateAndTime(date: string | undefined, time: string | undefined) {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  let parsedDate: Date | null = null;
  if (date) {
    parsedDate = parseIsoDate(date);
    if (!parsedDate) {
      return {
        ok: false,
        issue: "date" as const,
        message: "Please use a valid date in YYYY-MM-DD format.",
      };
    }

    if (parsedDate < today) {
      const suggestion = nextFutureDateSuggestion(now, parsedDate);
      return {
        ok: false,
        issue: "date" as const,
        message: `That date is in the past. Please choose a future date, for example ${formatIsoDate(suggestion)}.`,
      };
    }
  }

  if (time) {
    const minutes = parseTimeToMinutes(time);
    if (minutes === null) {
      return {
        ok: false,
        issue: "time" as const,
        message: "Please use time in HH:mm (24-hour), for example 20:00.",
      };
    }

    if (parsedDate && parsedDate.getTime() === today.getTime()) {
      const nowMinutes = now.getHours() * 60 + now.getMinutes();
      if (minutes <= nowMinutes) {
        return {
          ok: false,
          issue: "time" as const,
          message: "That time has already passed today. Please choose a later time.",
        };
      }
    }
  }

  return { ok: true };
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

  return messages
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
      if (!dateTimeValidation.ok) {
        return {
          ok: false,
          available: false,
          restaurantId,
          requestedSlot: time,
          remainingSlots: [] as string[],
          error: dateTimeValidation.message,
          message: dateTimeValidation.message,
          date: date ?? null,
          time,
        };
      }

      const restaurant = resolveRestaurantIdentifier(restaurantId);
      if (!restaurant) {
        return {
          ok: false,
          available: false,
          restaurantId,
          requestedSlot: time,
          remainingSlots: [] as string[],
          error: `Restaurant '${restaurantId}' not found.`,
          message: `I couldn’t match '${restaurantId}' to a restaurant in DineUp. Please try the restaurant name again.`,
          date: date ?? null,
          time,
        };
      }

      const result = checkAvailability(restaurant.id, time);
      return {
        ...result,
        date: date ?? null,
        time,
        message: result.ok
          ? result.available
            ? `Great news — ${result.restaurantName} has tables available${date ? ` on ${date}` : ""} at ${result.requestedSlot}.`
            : `${result.restaurantName} is fully booked${date ? ` on ${date}` : ""} at ${result.requestedSlot}. Consider: ${result.remainingSlots.join(", ") || "no more slots today"}.`
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
          missingFields,
          missingFieldLabels: readable,
          bookingMessage: `I can prepare your reservation. Please share: ${readable.join(", ")}.`,
          paymentOptions: [
            { id: "pay-now", label: "Pay now", status: "coming_soon" },
            { id: "pay-later", label: "Book now, pay at venue", status: "available" },
          ],
        };
      }

      const dateTimeValidation = validateDateAndTime(date, time);
      if (!dateTimeValidation.ok) {
        const missingIssue = dateTimeValidation.issue as string;
        return {
          ok: true,
          booked: false,
          readyForConfirmation: false,
          requiresDetails: true,
          restaurantId,
          requestedSlot: time,
          partySize,
          date,
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
          requestedSlot: time,
          partySize,
          slots: [] as string[],
          error: `Restaurant '${restaurantId}' not found.`,
          bookingMessage: `I couldn’t match '${restaurantId}' to a restaurant in DineUp. Please try again with the restaurant name.`,
          requiresDetails: true,
          readyForConfirmation: false,
        };
      }

      const availability = checkAvailability(restaurant.id, time as string);
      if (!availability.ok) {
        return {
          ok: false,
          booked: false,
          readyForConfirmation: false,
          requiresDetails: true,
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          requestedSlot: time,
          partySize,
          date,
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
          date,
          slots: availability.remainingSlots,
          bookingMessage: `${restaurant.name} is unavailable at ${availability.requestedSlot}. Please choose another slot.`,
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
        bookingMessage: `Perfect. Your table is ready to reserve at ${restaurant.name}, ${availability.requestedSlot}, party of ${partySize}. Choose a payment option to continue.`,
        requestedSlot: availability.requestedSlot,
        partySize,
        date: date ?? null,
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
  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      {
        error:
          "Missing GROQ_API_KEY. Add it to .env.local to enable Baymax.",
      },
      { status: 500 },
    );
  }

  // Groq-hosted model via the OpenAI-compatible provider
  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: process.env.GROQ_API_KEY,
  });

  try {
    const {
      messages,
      userLocation,
    }: {
      messages: UIMessage[];
      userLocation?: UserLocation | null;
    } = await request.json();

    // Strip UI-only / synthetic messages that are not valid model messages.
    // The intro assistant message injected on the client has id="intro" and
    // must not be forwarded to the model (it causes a validation error).
    const safeMessages = normalizeMessagesForModel(messages);

    const result = streamText({
      model: groq(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile"),
      system: createSystemPrompt(userLocation),
      messages: await convertToModelMessages(safeMessages),
      tools: appTools,
      temperature: 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error: unknown) {
    // Deep-log the full error so we can diagnose Groq / SDK issues in the
    // Vercel / Next.js server console without losing stack / cause details.
    console.error(
      "GROQ API FULL ERROR DETAILS:",
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
    return Response.json(
      { error: "Failed to communicate with gastronomy model." },
      { status: 500 }
    );
  }
}
