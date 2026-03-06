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

export const maxDuration = 45;

// Groq-hosted model via the OpenAI-compatible provider
const groq = createOpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

// ─── System prompt ────────────────────────────────────────────────────────────

const inventoryContext = JSON.stringify(restaurants, null, 2);

function formatLocationContext(userLocation: UserLocation | null | undefined) {
  if (!userLocation) {
    return "The user has not shared a live location yet. Ask for their neighborhood or preferred distance when relevant.";
  }
  return `The user is currently near latitude ${userLocation.latitude.toFixed(5)}, longitude ${userLocation.longitude.toFixed(5)} with ~${Math.round(userLocation.accuracy)} m accuracy.`;
}

function createSystemPrompt(userLocation: UserLocation | null | undefined) {
  return [
    "You are Baymax, the elite AI gastronomy assistant for DineUp. You help users find the perfect dining spot based on their specific location and preferences.",
    "Use ONLY the restaurant inventory provided below. Do not invent venues, availability, addresses, pricing, dietary tags, or contact details.",
    "When recommending a place, explain why it fits the request, mention relevant dietary tags or cuisine, and include practical details like neighborhood, phone, or website.",
    "If the user asks for something not present in the inventory, say so clearly and recommend the closest matching option.",
    "You have two tools available:",
    "• Use `checkAvailability` when the user asks if a specific restaurant has tables free on a given date/time.",
    "• Use `initiateBooking` when the user explicitly says they want to book or reserve a table at a restaurant — this renders an interactive booking card directly in the chat.",
    formatLocationContext(userLocation),
    "\nRestaurant inventory:\n" + inventoryContext,
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
        .describe("The requested date in YYYY-MM-DD format, e.g. '2026-03-08'."),
      time: z
        .string()
        .describe("The requested time slot exactly as it appears in reservationSlots, e.g. '8:00 PM'."),
    }),
    execute: async ({ restaurantId, date, time }) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) {
        return {
          available: false,
          message: `Restaurant '${restaurantId}' not found in the inventory.`,
        };
      }

      // Simulate real availability: 70 % chance of open seat.
      const available = Math.random() > 0.3;

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        date,
        time,
        available,
        message: available
          ? `Great news — ${restaurant.name} has tables available on ${date} at ${time}.`
          : `${restaurant.name} is fully booked on ${date} at ${time}. Consider an alternative slot: ${restaurant.reservationSlots.filter((s) => s !== time).join(", ") || "—"}.`,
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
    }),
    execute: async ({ restaurantId }) => {
      const restaurant = restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) {
        return { error: `Restaurant '${restaurantId}' not found.` };
      }

      return {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        neighborhood: restaurant.neighborhood,
        cuisine: restaurant.cuisine,
        rating: restaurant.rating,
        price: restaurant.price,
        slots: restaurant.reservationSlots,
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

  const {
    messages,
    userLocation,
  }: {
    messages: UIMessage[];
    userLocation?: UserLocation | null;
  } = await request.json();

  const result = streamText({
    model: groq(process.env.GROQ_MODEL ?? "openai/gpt-oss-20b"),
    system: createSystemPrompt(userLocation),
    messages: await convertToModelMessages(messages),
    tools: appTools,
    temperature: 1,
  });

  return result.toUIMessageStreamResponse();
}