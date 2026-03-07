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
  bookTable,
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
    "Use ONLY the restaurant inventory provided below.",
    "When recommending a place, use only 1 or 2 short sentences. Mention dietary tags or cuisine organically.",
    "You have two tools available:",
    "• Use `checkAvailability` when the user asks if a specific restaurant has tables free.",
    "• Use `initiateBooking` when the user explicitly says they want to book or reserve.",
    "Always pass booking/check times in 24-hour HH:mm format when possible (e.g. 20:00).",
    formatLocationContext(userLocation),
    "\nRestaurant inventory:\n" + buildInventoryContext(),
  ].join("\n\n");
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
      const result = checkAvailability(restaurantId, time);
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
      "Render an interactive mini-booking card in the chat UI so the user can reserve a table immediately. Call this when the user says they want to book, reserve, or make a reservation.",
    inputSchema: z.object({
      restaurantId: z
        .string()
        .describe("The `id` field of the restaurant the user wants to book."),
      time: z
        .string()
        .describe("Requested reservation time in HH:mm where possible, e.g. '20:00'."),
      partySize: z
        .number()
        .int()
        .min(1)
        .max(12)
        .describe("How many guests are included in the booking."),
      date: z
        .string()
        .optional()
        .describe("Optional requested date in YYYY-MM-DD format."),
    }),
    execute: async ({ restaurantId, time, partySize, date }) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) {
        return { error: `Restaurant '${restaurantId}' not found.` };
      }

      const booking = bookTable(restaurantId, time, partySize);

      return {
        booked: booking.booked,
        bookingMessage: booking.message,
        requestedSlot: booking.requestedSlot,
        partySize: booking.partySize,
        date: date ?? null,
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        neighborhood: restaurant.neighborhood,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        price: restaurant.price,
        slots: booking.remainingSlots,
        address: restaurant.address,
        image: restaurant.image,
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
    const VALID_ROLES = new Set(["user", "assistant", "system", "tool"]);
    const safeMessages = messages.filter(
      (m) => m.id !== "intro" && m.id !== "baymax-intro" && VALID_ROLES.has(m.role)
    );

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
