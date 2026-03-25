"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
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
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/map-store";

const BookingModal = dynamic(() => import("@/components/booking-modal").then(mod => mod.BookingModal), { ssr: false });

// --- Types --------------------------------------------------------------------

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
  result?: Record<string, unknown>;
  output?: Record<string, unknown>;
}

interface ToolInvocationPart {
  type: "tool-invocation";
  toolInvocationId: string;
  toolName: string;
  args: Record<string, unknown>;
  state: "call" | "partial-call" | "result";
  result?: Record<string, unknown>;
}

interface StaticToolUIPart {
  type: `tool-${string}`;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "output-available"
    | "output-error"
    | "output-denied";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  preliminary?: boolean;
  title?: string;
}

interface DynamicToolUIPart {
  type: "dynamic-tool";
  toolName: string;
  toolCallId: string;
  state:
    | "input-streaming"
    | "input-available"
    | "approval-requested"
    | "output-available"
    | "output-error"
    | "output-denied";
  input?: Record<string, unknown>;
  output?: Record<string, unknown>;
  errorText?: string;
  preliminary?: boolean;
  title?: string;
}

type MessagePart =
  | { type: "text"; text: string }
  | ToolCallPart
  | ToolResultPart
  | ToolInvocationPart
  | StaticToolUIPart
  | DynamicToolUIPart;

type BookingDraft = {
  restaurantId: string;
  date?: string;
  time?: string;
  partySize?: number;
};

type BookingPromptContext = {
  requiresDetails: boolean;
  missingFields: string[];
  missingFieldLabels: string[];
  restaurantName: string | null;
};

type BookingDraftContext = {
  restaurantId: string | null;
  date?: string;
  time?: string;
  partySize?: number;
};

function isStaticToolUIPart(part: MessagePart): part is StaticToolUIPart {
  return part.type.startsWith("tool-") && part.type !== "tool-call" && part.type !== "tool-result";
}

function getStaticToolName(part: StaticToolUIPart) {
  return part.type.slice("tool-".length);
}

// --- Starter message ----------------------------------------------------------

const STARTER_ID = "baymax-intro";

const starterBubble: UIMessage = {
  id: STARTER_ID,
  role: "assistant",
  parts: [{ type: "text", text: "Hello! I am Baymax, your personal dining concierge. Tell me what you are craving tonight and I will find the perfect table." }],
};

const defaultQuickPrompts = [
  "Food near me",
  "Book Toit at 8 PM for 2",
  "Is Cafe Good Luck free at 8 PM?",
];

const knownRestaurantNames = restaurants
  .map((restaurant) => restaurant.name.trim())
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

const cuisineKeywords = [
  "north indian",
  "south indian",
  "indian",
  "chinese",
  "thai",
  "japanese",
  "korean",
  "italian",
  "continental",
  "seafood",
  "bbq",
  "biryani",
  "pizza",
  "burger",
  "vegan",
  "vegetarian",
  "non veg",
];

const budgetKeywords = ["cheap", "budget", "affordable", "mid range", "premium", "fine dining", "expensive"];

function extractRecentUserTexts(messages: UIMessage[], maxItems = 4) {
  const userTexts: string[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "user") continue;

    const textPart = message.parts.find(
      (part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string",
    );

    if (!textPart?.text.trim()) continue;
    userTexts.push(textPart.text.trim());

    if (userTexts.length >= maxItems) break;
  }

  return userTexts.reverse();
}

function extractRecentAssistantTexts(messages: UIMessage[], maxItems = 2) {
  const assistantTexts: string[] = [];

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (message.role !== "assistant") continue;

    const textPart = message.parts.find(
      (part): part is { type: "text"; text: string } => part.type === "text" && typeof part.text === "string",
    );

    if (!textPart?.text.trim()) continue;
    assistantTexts.push(textPart.text.trim());

    if (assistantTexts.length >= maxItems) break;
  }

  return assistantTexts.reverse();
}

function detectRestaurantName(text: string) {
  const normalized = text.toLowerCase();
  return knownRestaurantNames.find((name) => normalized.includes(name.toLowerCase())) ?? null;
}

function extractTimePhrase(text: string) {
  const normalized = text.toLowerCase();
  const explicit = normalized.match(/\b(?:[1-9]|1[0-2])(?::[0-5]\d)?\s?(?:am|pm)\b|\b(?:[01]?\d|2[0-3]):[0-5]\d\b/i);
  if (explicit?.[0]) return explicit[0].toUpperCase();

  const relative = normalized.match(/\b(today|tonight|tomorrow|this evening|evening|lunch|dinner|breakfast|late night)\b/i);
  return relative?.[0] ?? null;
}

function extractIsoDate(text: string) {
  const match = text.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  return match?.[1] ?? null;
}

function extractRelativeDateSignal(text: string) {
  const match = text.match(/\b(today|tomorrow|day after tomorrow|tonight|this weekend|next weekend|next week)\b/i);
  return match?.[1] ?? null;
}

function parseTimePhraseToHHmm(value: string) {
  const normalized = value.trim().toLowerCase();

  const twentyFour = normalized.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFour) {
    const hour = Number.parseInt(twentyFour[1], 10);
    const minute = Number.parseInt(twentyFour[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }

  const twelveHour = normalized.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!twelveHour) return null;

  const rawHour = Number.parseInt(twelveHour[1], 10);
  const minute = Number.parseInt(twelveHour[2] ?? "00", 10);
  const meridiem = twelveHour[3];
  if (rawHour < 1 || rawHour > 12 || minute < 0 || minute > 59) return null;

  const hour = meridiem === "pm" ? (rawHour % 12) + 12 : rawHour % 12;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function toDisplayTimeLabel(timePhrase: string | null) {
  if (!timePhrase) return "8:00 PM";

  const normalized = parseTimePhraseToHHmm(timePhrase);
  if (normalized) return formatSlotChipLabel(normalized);

  if (timePhrase.toLowerCase() === "tonight") return "8:00 PM";
  return timePhrase;
}

function buildExplicitDayBookingChip(
  dayLabel: "Today" | "Tomorrow" | "Day After Tomorrow",
  restaurantName: string | null,
  timeLabel: string,
  partySize: number,
) {
  if (restaurantName) {
    return `${dayLabel} - ${restaurantName} - ${timeLabel} - ${partySize} guests`;
  }
  return `${dayLabel} - ${timeLabel} - ${partySize} guests`;
}

function extractPartySize(text: string) {
  const normalized = text.toLowerCase();
  const sizedGroup = normalized.match(/\bfor\s+(\d{1,2})\s*(?:people|persons?|guests?|pax)?\b/i);
  if (sizedGroup?.[1]) return Number.parseInt(sizedGroup[1], 10);

  const bareGroup = normalized.match(/\b(\d{1,2})\s*(?:people|persons?|guests?|pax)\b/i);
  if (bareGroup?.[1]) return Number.parseInt(bareGroup[1], 10);

  return null;
}

function hasAnyKeyword(text: string, keywords: string[]) {
  const normalized = text.toLowerCase();
  return keywords.some((keyword) => normalized.includes(keyword));
}

function formatUpcomingDateLabel(date: Date, offset: number) {
  if (offset === 0) return "Today";
  if (offset === 1) return "Tomorrow";
  return new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
}

function formatClockLabel(date: Date) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

function buildUpcomingDateTimeLabels() {
  const templates = [
    { dayOffset: 0, hour: 20, minute: 0 },
    { dayOffset: 1, hour: 20, minute: 0 },
    { dayOffset: 2, hour: 20, minute: 30 },
  ];

  return templates.map(({ dayOffset, hour, minute }) => {
    const date = new Date();
    date.setHours(hour, minute, 0, 0);
    date.setDate(date.getDate() + dayOffset);
    return `${formatUpcomingDateLabel(date, dayOffset)} at ${formatClockLabel(date)}`;
  });
}

function buildDateTimePromptOptions(restaurantName: string | null) {
  const upcoming = buildUpcomingDateTimeLabels();

  if (restaurantName) {
    return [
      `${restaurantName} - ${upcoming[0]}`,
      `${restaurantName} - ${upcoming[1]}`,
      `${restaurantName} - ${upcoming[2]}`,
      "Custom date and time",
      "Choose another restaurant",
    ];
  }

  return [
    `Book for ${upcoming[0]}`,
    `Book for ${upcoming[1]}`,
    `Book for ${upcoming[2]}`,
    "Custom date and time",
    "Choose another restaurant",
  ];
}

function buildDateOnlyPromptOptions(restaurantName: string | null, timePhrase: string | null, partySize: number | null) {
  const guests = partySize ?? 2;
  const timeLabel = toDisplayTimeLabel(timePhrase);

  return [
    buildExplicitDayBookingChip("Today", restaurantName, timeLabel, guests),
    buildExplicitDayBookingChip("Tomorrow", restaurantName, timeLabel, guests),
    buildExplicitDayBookingChip("Day After Tomorrow", restaurantName, timeLabel, guests),
    "Custom date",
    "Custom date and time",
  ];
}

function buildTimeOnlyPromptOptions(restaurantName: string | null, dateSignal: string | null, partySize: number | null) {
  const guests = partySize ?? 2;
  const day = dateSignal ?? "today";

  if (restaurantName) {
    return [
      `Book ${restaurantName} ${day} at 7:30 PM for ${guests}`,
      `Book ${restaurantName} ${day} at 8:00 PM for ${guests}`,
      `Book ${restaurantName} ${day} at 8:30 PM for ${guests}`,
      "Custom date and time",
    ];
  }

  return [
    `Book ${day} at 7:30 PM for ${guests}`,
    `Book ${day} at 8:00 PM for ${guests}`,
    `Book ${day} at 8:30 PM for ${guests}`,
    "Custom date and time",
  ];
}

function buildRestaurantChoicePrompts(limit = 3) {
  const top = restaurants.slice(0, limit).map((restaurant) => `Try ${restaurant.name}`);
  return [...top, "Choose another restaurant"];
}

function extractBookingPromptContextFromOutput(output: Record<string, unknown>): BookingPromptContext {
  const missingFields = Array.isArray(output.missingFields)
    ? output.missingFields.filter((value): value is string => typeof value === "string")
    : [];

  const missingFieldLabels = Array.isArray(output.missingFieldLabels)
    ? output.missingFieldLabels.filter((value): value is string => typeof value === "string")
    : [];

  return {
    requiresDetails: Boolean(output.requiresDetails),
    missingFields,
    missingFieldLabels,
    restaurantName: typeof output.restaurantName === "string" ? output.restaurantName : null,
  };
}

function extractLatestBookingPromptContext(messages: UIMessage[]): BookingPromptContext | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    const parts = message.parts as MessagePart[];

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex];

      if (part.type === "tool-invocation") {
        const inv = part as ToolInvocationPart;
        if (inv.toolName === "initiateBooking" && inv.state === "result" && inv.result) {
          return extractBookingPromptContextFromOutput(inv.result);
        }
      }

      if (isStaticToolUIPart(part)) {
        const toolName = getStaticToolName(part);
        if (toolName === "initiateBooking" && part.state === "output-available" && part.output) {
          return extractBookingPromptContextFromOutput(part.output);
        }
      }

      if (part.type === "dynamic-tool" && part.toolName === "initiateBooking" && part.state === "output-available" && part.output) {
        return extractBookingPromptContextFromOutput(part.output);
      }

      if (part.type === "tool-result") {
        const resultPart = part as ToolResultPart;
        if (resultPart.toolName === "initiateBooking") {
          const output = resultPart.result ?? resultPart.output;
          if (output) {
            return extractBookingPromptContextFromOutput(output);
          }
        }
      }
    }
  }

  return null;
}

function extractBookingDraftContextFromOutput(output: Record<string, unknown>): BookingDraftContext {
  return {
    restaurantId: typeof output.restaurantId === "string" ? output.restaurantId : null,
    date: typeof output.date === "string" ? output.date : undefined,
    time: typeof output.requestedSlot === "string"
      ? output.requestedSlot
      : typeof output.time === "string"
        ? output.time
        : undefined,
    partySize: typeof output.partySize === "number" ? output.partySize : undefined,
  };
}

function extractLatestBookingDraftContext(messages: UIMessage[]): BookingDraftContext | null {
  for (let messageIndex = messages.length - 1; messageIndex >= 0; messageIndex -= 1) {
    const message = messages[messageIndex];
    const parts = message.parts as MessagePart[];

    for (let partIndex = parts.length - 1; partIndex >= 0; partIndex -= 1) {
      const part = parts[partIndex];

      if (part.type === "tool-invocation") {
        const inv = part as ToolInvocationPart;
        if (inv.toolName === "initiateBooking" && inv.state === "result" && inv.result) {
          const context = extractBookingDraftContextFromOutput(inv.result);
          if (context.restaurantId) return context;
        }
      }

      if (isStaticToolUIPart(part)) {
        const toolName = getStaticToolName(part);
        if (toolName === "initiateBooking" && part.state === "output-available" && part.output) {
          const context = extractBookingDraftContextFromOutput(part.output);
          if (context.restaurantId) return context;
        }
      }

      if (part.type === "dynamic-tool" && part.toolName === "initiateBooking" && part.state === "output-available" && part.output) {
        const context = extractBookingDraftContextFromOutput(part.output);
        if (context.restaurantId) return context;
      }

      if (part.type === "tool-result") {
        const resultPart = part as ToolResultPart;
        if (resultPart.toolName === "initiateBooking") {
          const output = resultPart.result ?? resultPart.output;
          if (output) {
            const context = extractBookingDraftContextFromOutput(output);
            if (context.restaurantId) return context;
          }
        }
      }
    }
  }

  return null;
}

function buildBookingMissingDetailPrompts(messages: UIMessage[]) {
  const context = extractLatestBookingPromptContext(messages);
  if (!context?.requiresDetails || (context.missingFieldLabels.length === 0 && context.missingFields.length === 0)) {
    return null;
  }

  const recentUserTexts = extractRecentUserTexts(messages, 6);
  const combinedUserText = recentUserTexts.join(" ");
  const timePhrase = extractTimePhrase(combinedUserText);
  const dateSignal = extractIsoDate(combinedUserText) ?? extractRelativeDateSignal(combinedUserText);
  const partySize = extractPartySize(combinedUserText);

  const machineMissing = context.missingFields.map((value) => value.toLowerCase());
  const missing = context.missingFieldLabels.map((value) => value.toLowerCase());
  const needsDate = machineMissing.includes("date") || missing.some((value) => value.includes("date"));
  const needsTime = machineMissing.includes("time") || missing.some((value) => value.includes("time") || value.includes("slot"));
  const needsDateOrTime = needsDate || needsTime;
  const needsPartySize = missing.some((value) => value.includes("party") || value.includes("people") || value.includes("guest"));

  if (needsDate && !needsTime) {
    return buildDateOnlyPromptOptions(context.restaurantName, timePhrase, partySize);
  }

  if (needsTime && !needsDate) {
    return buildTimeOnlyPromptOptions(context.restaurantName, dateSignal, partySize);
  }

  if (needsDateOrTime) {
    return buildDateOnlyPromptOptions(context.restaurantName, timePhrase, partySize);
  }

  if (needsPartySize) {
    return [
      "For 2 people",
      "For 4 people",
      "For 6 people",
      "Custom party size",
    ];
  }

  return [
    "Share reservation details",
    "Show date and time options",
    "Custom date and time",
  ];
}

function sanitizeDisplayedText(value: string) {
  return value
    .replace(/\uFFFD/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .trim();
}

function formatSlotChipLabel(slot: string) {
  const match = slot.match(/^(\d{2}):(\d{2})$/);
  if (!match) return slot;

  const hour24 = Number.parseInt(match[1], 10);
  const minute = match[2];
  const meridiem = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;
  return `${hour12}:${minute} ${meridiem}`;
}

function getDateInfo(offset: number) {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() + offset);

  const key = date.toISOString().slice(0, 10);
  const label = offset === 0
    ? "Today"
    : offset === 1
      ? "Tomorrow"
      : new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);

  return { key, label };
}

function buildDateTimeSuggestionChips(slots: string[]) {
  const fallbackSlots = slots.length > 0 ? slots : ["20:00", "20:30", "21:00"];

  return [0, 1, 2].map((offset, idx) => {
    const dateInfo = getDateInfo(offset);
    const time = fallbackSlots[Math.min(idx, fallbackSlots.length - 1)];

    return {
      date: dateInfo.key,
      time,
      label: `${dateInfo.label} - ${formatSlotChipLabel(time)}`,
    };
  });
}

function buildContextualQuickPrompts(messages: UIMessage[]) {
  const recentUserTexts = extractRecentUserTexts(messages, 8);
  const recentAssistantTexts = extractRecentAssistantTexts(messages, 2);
  if (recentUserTexts.length === 0) return defaultQuickPrompts;

  const latestText = recentUserTexts[recentUserTexts.length - 1].toLowerCase();
  const combinedText = recentUserTexts.join(" ").toLowerCase();
  const latestAssistantText = (recentAssistantTexts[recentAssistantTexts.length - 1] ?? "").toLowerCase();

  const restaurantName = detectRestaurantName(combinedText);
  const timePhrase = extractTimePhrase(combinedText);
  const isoDate = extractIsoDate(combinedText);
  const relativeDateSignal = extractRelativeDateSignal(combinedText);
  const hasDateSignal = Boolean(isoDate || relativeDateSignal);
  const partySize = extractPartySize(combinedText);
  const hasCuisinePreference = hasAnyKeyword(combinedText, cuisineKeywords);
  const hasBudgetPreference = hasAnyKeyword(combinedText, budgetKeywords);

  const asksAvailability = /\b(available|availability|free|slot|open table|open)\b/.test(latestText);
  const wantsBooking = /\b(book|reserve|reservation|table|confirm)\b/.test(latestText);
  const wantsDiscovery = /\b(best|nearby|near me|closest|suggest|recommend|find|good|options?)\b/.test(latestText) || (!asksAvailability && !wantsBooking);

  const assistantAskedDateOrTime = /\b(what date|which date|share.*date|what time|which time|slot|date and time)\b/.test(latestAssistantText);
  const assistantAskedDate = /\b(what date|which date|share.*date|date\s*\(?(?:yyyy[-/ ]?mm[-/ ]?dd|dd[-/ ]?mm[-/ ]?yyyy)?\)?|pick a date|choose a date)\b/.test(latestAssistantText);
  const assistantAskedTime = /\b(what time|which time|share.*time|pick a time|choose a time|time slot|slot)\b/.test(latestAssistantText);
  const assistantAskedPartySize = /\b(how many|party size|guests|people)\b/.test(latestAssistantText);
  const assistantAskedRestaurant = /\b(which restaurant|restaurant name|place name)\b/.test(latestAssistantText);

  if (assistantAskedDate && !hasDateSignal) {
    return buildDateOnlyPromptOptions(restaurantName, timePhrase, partySize);
  }

  if (assistantAskedTime && !timePhrase) {
    return buildTimeOnlyPromptOptions(restaurantName, relativeDateSignal, partySize);
  }

  if (assistantAskedDateOrTime && !timePhrase) {
    return buildDateTimePromptOptions(restaurantName);
  }

  if (assistantAskedPartySize && !partySize) {
    return [
      "For 2 people",
      "For 4 people",
      "For 6 people",
      "Custom party size",
    ];
  }

  if (assistantAskedRestaurant && !restaurantName) {
    return buildRestaurantChoicePrompts();
  }

  if (restaurantName && isoDate && timePhrase && !partySize) {
    return [
      `${restaurantName} ${isoDate} ${timePhrase} for 2`,
      `${restaurantName} ${isoDate} ${timePhrase} for 4`,
      "Custom party size",
      "Choose another restaurant",
    ];
  }

  if ((wantsBooking || asksAvailability) && restaurantName && timePhrase && !partySize) {
    return [
      `Book ${restaurantName} at ${timePhrase} for 2`,
      `Book ${restaurantName} at ${timePhrase} for 4`,
      `Try another time at ${restaurantName}`,
      "Custom party size",
      "Choose another restaurant",
    ];
  }

  if ((wantsBooking || asksAvailability) && restaurantName && !timePhrase) {
    return buildDateTimePromptOptions(restaurantName);
  }

  if ((wantsBooking || asksAvailability) && restaurantName && timePhrase && partySize) {
    return [
      `Check ${restaurantName} ${timePhrase} for ${partySize}`,
      `Reserve ${restaurantName} ${timePhrase} for ${partySize}`,
      `More slots at ${restaurantName}`,
      "Custom date and time",
      "Choose another restaurant",
    ];
  }

  if (wantsDiscovery && !timePhrase) {
    if (!hasCuisinePreference && !hasBudgetPreference) {
      return [
        "Best restaurants near me",
        "Veg-friendly places near me",
        "Budget-friendly places nearby",
        "Top-rated places near me",
      ];
    }

    if (hasCuisinePreference && !hasBudgetPreference) {
      return [
        "Show top-rated options near me",
        "Find a table at 8 PM",
        "Add budget filter",
        "Book top suggestion for 2",
      ];
    }

    return [
      "Find the best match near me",
      "Show options at 8 PM",
      "Book top suggestion for 2",
      "Custom date and time",
    ];
  }

  if (wantsDiscovery && timePhrase && !partySize) {
    return [
      `Best options near me at ${timePhrase}`,
      `Book top option at ${timePhrase} for 2`,
      "For 4 people",
      "Custom party size",
    ];
  }

  if (!restaurantName && timePhrase && partySize) {
    return [
      `Top tables at ${timePhrase} for ${partySize}`,
      "Suggest restaurants near me",
      "Filter options by cuisine",
      "Custom date and time",
    ];
  }

  if (!partySize && (wantsBooking || asksAvailability || timePhrase !== null)) {
    if (!timePhrase) {
      return buildDateTimePromptOptions(restaurantName);
    }

    return [
      "For 2 people",
      "For 4 people",
      "For 6 people",
      "Custom party size",
    ];
  }

  return defaultQuickPrompts;
}

function splitQueryTerms(query: string) {
  return query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
}

function normalizeSuggestion(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function buildSearchSuggestions(messages: UIMessage[], input: string, quickPrompts: string[]) {
  const query = input.trim();
  if (!query) return [];

  const queryLower = query.toLowerCase();
  const terms = splitQueryTerms(query);
  const recentUserTexts = extractRecentUserTexts(messages, 6);
  const historyText = recentUserTexts.join(" ");
  const combinedText = `${historyText} ${query}`.trim();
  const restaurantName = detectRestaurantName(combinedText);
  const timePhrase = extractTimePhrase(combinedText);
  const partySize = extractPartySize(combinedText);

  const asksAvailability = /\b(available|availability|free|slot|open table|open)\b/.test(queryLower);
  const wantsBooking = /\b(book|reserve|reservation|table|confirm)\b/.test(queryLower);
  const wantsDiscovery = /\b(best|near|near me|nearby|suggest|recommend|find|options?)\b/.test(queryLower);

  const candidates: string[] = [];
  candidates.push(...quickPrompts);

  for (let index = recentUserTexts.length - 1; index >= 0; index -= 1) {
    const text = recentUserTexts[index]?.trim();
    if (text) candidates.push(text);
  }

  knownRestaurantNames
    .filter((name) => name.toLowerCase().includes(queryLower))
    .slice(0, 5)
    .forEach((name) => {
      candidates.push(`Book ${name} at 8 PM for 2`);
      candidates.push(`Is ${name} available tonight?`);
    });

  cuisineKeywords
    .filter((keyword) => keyword.includes(queryLower) || queryLower.includes(keyword))
    .slice(0, 4)
    .forEach((keyword) => {
      candidates.push(`${keyword} near me`);
      candidates.push(`Best ${keyword} restaurants near me`);
    });

  if (restaurantName) {
    candidates.push(`Book ${restaurantName} at 8 PM for 2`);
    candidates.push(`Is ${restaurantName} available tonight?`);
    candidates.push(`Show evening slots for ${restaurantName}`);
  }

  if (wantsBooking) {
    candidates.push(`Book table for 2${timePhrase ? ` at ${timePhrase}` : " tonight"}`);
    candidates.push(`Reserve a table for 4${timePhrase ? ` at ${timePhrase}` : ""}`);
    if (restaurantName) {
      candidates.push(`Reserve ${restaurantName}${timePhrase ? ` at ${timePhrase}` : ""}${partySize ? ` for ${partySize}` : " for 2"}`);
    }
  }

  if (asksAvailability) {
    candidates.push(`Check availability${timePhrase ? ` at ${timePhrase}` : " tonight"}`);
    if (restaurantName) {
      candidates.push(`Check ${restaurantName} availability${timePhrase ? ` at ${timePhrase}` : ""}`);
    }
  }

  if (wantsDiscovery) {
    candidates.push("Best restaurants near me");
    candidates.push("Top-rated places nearby");
    candidates.push("Budget-friendly places near me");
  }

  if (timePhrase && !partySize) {
    candidates.push(`${query} for 2`);
    candidates.push(`${query} for 4`);
  }

  const scored = new Map<string, { suggestion: string; score: number }>();

  const addScoredCandidate = (suggestion: string) => {
    const trimmed = suggestion.trim();
    if (!trimmed) return;

    const normalized = normalizeSuggestion(trimmed);
    const candidateLower = trimmed.toLowerCase();

    let score = 0;
    if (candidateLower.startsWith(queryLower)) score += 120;
    if (candidateLower.includes(queryLower)) score += 70;

    for (const term of terms) {
      if (candidateLower.includes(term)) score += 18;
    }

    if (normalized === normalizeSuggestion(query)) score += 20;
    if (score <= 0) return;

    const existing = scored.get(normalized);
    if (!existing || score > existing.score) {
      scored.set(normalized, { suggestion: trimmed, score });
    }
  };

  addScoredCandidate(query);
  candidates.forEach(addScoredCandidate);

  return Array.from(scored.values())
    .sort((a, b) => b.score - a.score || a.suggestion.length - b.suggestion.length)
    .slice(0, 6)
    .map((entry) => entry.suggestion);
}

function parseRetryHint(message: string) {
  const minuteSecond = message.match(/([0-9]+)m([0-9]+(?:\.[0-9]+)?)s/i);
  if (minuteSecond) {
    const minutes = Number.parseInt(minuteSecond[1], 10);
    const seconds = Math.ceil(Number.parseFloat(minuteSecond[2]));
    if (!Number.isNaN(minutes) && !Number.isNaN(seconds)) {
      return `${minutes}m ${seconds}s`;
    }
  }

  const secondsOnly = message.match(/retry\s+after\s+([0-9]+)\s*seconds?/i);
  if (secondsOnly) {
    const seconds = Number.parseInt(secondsOnly[1], 10);
    if (!Number.isNaN(seconds)) {
      const minutes = Math.floor(seconds / 60);
      const remaining = seconds % 60;
      return minutes > 0 ? `${minutes}m ${remaining}s` : `${remaining}s`;
    }
  }

  return null;
}

function toFriendlyChatError(rawMessage: string | null | undefined) {
  const message = (rawMessage ?? "").trim();
  if (!message) return "Baymax is temporarily unavailable. Please try again shortly.";

  const lowered = message.toLowerCase();

  if (
    lowered.includes("rate limit")
    || lowered.includes("tokens per day")
    || lowered.includes("failed after 3 attempts")
    || lowered.includes("429")
  ) {
    const retry = parseRetryHint(message);
    return retry
      ? `Baymax is temporarily busy due to AI provider limits. Please retry in about ${retry}.`
      : "Baymax is temporarily busy due to AI provider limits. Please retry shortly.";
  }

  if (lowered.includes("missing ai provider configuration")) {
    return "Baymax is not configured on the server yet. Please set AI provider environment variables.";
  }

  if (lowered.includes("failed to communicate")) {
    return "Baymax could not reach the AI provider right now. Please retry in a moment.";
  }

  return sanitizeDisplayedText(message);
}

function isProviderLimitError(rawMessage: string | null | undefined) {
  const lowered = (rawMessage ?? "").toLowerCase();
  return (
    lowered.includes("rate limit")
    || lowered.includes("tokens per day")
    || lowered.includes("failed after 3 attempts")
    || lowered.includes("temporarily busy due to ai provider limits")
    || lowered.includes("429")
  );
}

function buildOfflineBaymaxReply(userInput: string) {
  const normalized = userInput.trim().toLowerCase();
  const restaurant = detectRestaurantName(userInput);
  const time = extractTimePhrase(userInput);
  const partySize = extractPartySize(userInput);

  const isBookingIntent = /\b(book|reserve|reservation|table|confirm)\b/.test(normalized);
  const isAvailabilityIntent = /\b(available|availability|free|slot|open)\b/.test(normalized);

  if (restaurant && (isBookingIntent || isAvailabilityIntent)) {
    return `I can prepare ${restaurant}${time ? ` at ${time}` : ""}${partySize ? ` for ${partySize}` : ""}. Provider is busy now, please retry in a moment or tap a quick suggestion.`;
  }

  if (restaurant) {
    return `Great choice: ${restaurant}. I can help with slots, booking, and party size as soon as provider traffic drops.`;
  }

  if (isBookingIntent) {
    return "I am in backup mode. Share restaurant, date, time, and party size, then retry once provider load drops.";
  }

  return "I am in backup mode due to provider traffic. Try a quick prompt like 'Best restaurants near me' or 'Book Toit at 8 PM for 2'.";
}

// --- Tool badge ---------------------------------------------------------------

function ToolCallingBadge({ toolName }: { toolName: string }) {
  const label =
    toolName === "checkAvailability" ? "Checking availability..."
    : toolName === "initiateBooking" ? "Loading booking card..."
    : `Running ${toolName}...`;

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

// --- Availability card --------------------------------------------------------

function AvailabilityResultCard({ result }: { result: Record<string, unknown> }) {
  const available = result.available as boolean;
  const message = sanitizeDisplayedText((result.message as string) ?? "");
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

function ToolErrorCard({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-red-500">{title}</p>
        <p className="mt-1 leading-relaxed">{sanitizeDisplayedText(message)}</p>
      </div>
    </div>
  );
}

// --- Booking card -------------------------------------------------------------

function BookingCard({ result, onBook }: { result: Record<string, unknown>; onBook: (draft: BookingDraft) => void }) {
  const resultRestaurantId = typeof result.restaurantId === "string" ? result.restaurantId : null;
  const resultRestaurantName = typeof result.restaurantName === "string" ? result.restaurantName : null;

  const restaurant = resultRestaurantId
    ? restaurants.find((r) => r.id === resultRestaurantId)
    : (resultRestaurantName
      ? restaurants.find((r) => r.name.toLowerCase() === resultRestaurantName.toLowerCase())
      : undefined);

  const restaurantId = restaurant?.id ?? resultRestaurantId ?? "";

  const restaurantName = (result.restaurantName as string) ?? restaurant?.name;
  const neighborhood = (result.neighborhood as string) ?? restaurant?.neighborhood;
  const cuisine = (result.cuisine as string) ?? restaurant?.cuisine;
  const rating = (result.rating as number) ?? restaurant?.rating;
  const price = (result.price as string) ?? restaurant?.price;
  const slots = (result.slots as string[]) ?? [];
  const booked = Boolean(result.booked);
  const readyForConfirmation = Boolean(result.readyForConfirmation);
  const requiresDetails = Boolean(result.requiresDetails);
  const bookingMessage = result.bookingMessage as string | undefined;
  const requestedSlot = result.requestedSlot as string | undefined;
  const date = result.date as string | undefined;
  const partySize = typeof result.partySize === "number" ? result.partySize : undefined;
  const estimatedSubtotal = typeof result.estimatedSubtotal === "number" ? result.estimatedSubtotal : null;
  const prebookingAmount = typeof result.prebookingAmount === "number" ? result.prebookingAmount : null;
  const missingFieldLabels = ((result.missingFieldLabels as string[] | undefined) ?? []).filter(Boolean);
  const needsDateOrTime = missingFieldLabels.some((field) => /date|time|slot/i.test(field));
  const dateTimeSuggestionChips = useMemo(() => buildDateTimeSuggestionChips(slots), [slots]);

  // Look up coordinates for the "View on Map" button
  const setMapTarget = useMapStore((s) => s.setMapTarget);
  const { user, openAuthModal } = useAuthStore();

  return (
    <div className="flex justify-start">
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        className="w-full max-w-[92%] overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-[0_8px_32px_rgba(0,0,0,0.08)]"
      >
        {/* Card header */}
        <div className="bg-linear-to-r from-[#FF6B35] to-[#FF4F5A] px-4 py-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-white/70">{cuisine}</p>
              <p className="mt-0.5 font-semibold text-white">{restaurantName}</p>
            </div>
            <span className="mt-0.5 flex items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-xs font-semibold text-white">
              <Star className="h-3 w-3 fill-white text-white" />{rating?.toFixed(1) ?? "-"}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-white/70">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{neighborhood}</span>
            <span>{price}</span>
          </div>
        </div>

        {/* Time slots */}
        <div className="px-4 py-3">
          <p className="mb-2 text-[10px] uppercase tracking-[0.2em] text-slate-400">
            {booked ? "Remaining slots" : "Available tonight"}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {slots.map((slot) => (
              <span key={slot} className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs font-medium text-slate-700">
                <Clock className="h-3 w-3 text-[#FF6B35]" />{slot}
              </span>
            ))}
          </div>
        </div>

        {bookingMessage && (
          <div className="px-4 pb-2">
            <div className={cn(
              "rounded-xl border px-3 py-2 text-xs",
              readyForConfirmation
                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border-orange-200 bg-orange-50 text-orange-700",
            )}>
              {sanitizeDisplayedText(bookingMessage)}
            </div>
          </div>
        )}

        {requiresDetails && missingFieldLabels.length > 0 && (
          <div className="px-4 pb-2">
            <div className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-slate-600">
              Missing details: {missingFieldLabels.join(", ")}.
            </div>
            {needsDateOrTime && (
              <>
                <div className="mt-2 rounded-xl border border-orange-200 bg-orange-50 px-3 py-2">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-orange-600">Choose date and time</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {dateTimeSuggestionChips.map((chip) => (
                      <button
                        key={`${chip.date}-${chip.time}`}
                        type="button"
                        disabled={!restaurantId}
                        onClick={() => onBook({
                          restaurantId,
                          date: chip.date,
                          time: chip.time,
                          partySize,
                        })}
                        className="rounded-xl border border-orange-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 transition-all hover:border-orange-300 hover:bg-orange-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="mt-2 rounded-xl border border-gray-200 bg-white px-3 py-2">
                  <button
                    type="button"
                    disabled={!restaurantId}
                    onClick={() => onBook({
                      restaurantId,
                      date: undefined,
                      time: undefined,
                      partySize,
                    })}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-all hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Custom date and time
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {readyForConfirmation && estimatedSubtotal !== null && prebookingAmount !== null && (
          <div className="px-4 pb-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-700">
              <p className="font-semibold text-slate-900">Pre-booking payment options</p>
              <p className="mt-1">Estimated bill: Rs. {estimatedSubtotal.toLocaleString("en-IN")}</p>
              <p>Pay-now amount (20%): Rs. {prebookingAmount.toLocaleString("en-IN")}</p>
            </div>
          </div>
        )}

        {!booked && !user && (
          <div className="px-4 pb-2">
            <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-700">
              Sign in first to continue to the booking flow.
            </div>
          </div>
        )}

        {/* CTA row */}
        <div className="px-4 pb-4 flex gap-2">
          {readyForConfirmation && (
            <button
              type="button"
              disabled
              className="flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-gray-100 px-3 py-2.5 text-xs font-semibold text-slate-500"
              title="Payment gateway integration coming soon"
            >
              Pay now (coming soon)
            </button>
          )}

          {!booked && restaurantId && !requiresDetails && (
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  openAuthModal();
                  return;
                }
                onBook({
                  restaurantId,
                  date,
                  time: requestedSlot,
                  partySize,
                });
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B35] py-2.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(255,107,53,0.3)] hover:shadow-[0_8px_24px_rgba(255,107,53,0.4)] active:scale-[0.98] transition-all"
            >
              <CalendarCheck className="h-4 w-4" />{user ? (readyForConfirmation ? "Book now, pay at venue" : "Reserve table") : "Sign in to reserve"}
            </button>
          )}
          {booked && requestedSlot && (
            <span className="flex-1 flex items-center text-xs font-medium text-emerald-700">
              Confirmed at {requestedSlot}.
            </span>
          )}
          {restaurant && (
            <button
              type="button"
              onClick={() => {
                setMapTarget({
                  longitude: restaurant.coordinates[0],
                  latitude: restaurant.coordinates[1],
                  restaurantId: restaurant.id,
                });
                document.getElementById("explore-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-xs font-semibold text-slate-600 hover:border-orange-200 hover:bg-orange-50 hover:text-orange-600 active:scale-95 transition-all"
            >
              <MapPin className="h-3.5 w-3.5" />View on Map
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function renderToolResult(
  toolName: string,
  result: Record<string, unknown> | undefined,
  idx: number,
  onBook: (draft: BookingDraft) => void,
) {
  if (!result) {
    return <ToolErrorCard key={idx} title={toolName} message="Baymax completed the action, but no result payload was returned." />;
  }

  const errorMessage = typeof result.error === "string"
    ? result.error
    : typeof result.message === "string" && result.ok === false
      ? result.message
      : typeof result.bookingMessage === "string" && result.ok === false
        ? result.bookingMessage
        : null;

  if (errorMessage) {
    return <ToolErrorCard key={idx} title={toolName} message={errorMessage} />;
  }

  if (toolName === "checkAvailability") {
    return <AvailabilityResultCard key={idx} result={result} />;
  }

  if (toolName === "initiateBooking") {
    return <BookingCard key={idx} result={result} onBook={onBook} />;
  }

  return null;
}

// --- Props --------------------------------------------------------------------

type BaymaxChatProps = {
  userLocation: UserLocation | null;
  locationStatus: GeolocationStatus;
};

// --- Main component -----------------------------------------------------------

export function BaymaxChat({ userLocation, locationStatus }: BaymaxChatProps) {
  // Start closed and auto-open after a short delay on fresh page load.
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [bookingDraft, setBookingDraft] = useState<BookingDraft | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [offlineReply, setOfflineReply] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const autoOpenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUserInputRef = useRef("");

  const transport = useMemo(() => new DefaultChatTransport({ api: "/api/chat" }), []);

  const { error, messages, sendMessage, status } = useChat({
    transport,
    experimental_throttle: 40,
    onError: (err) => {
      const raw = err instanceof Error ? err.message : "";
      const friendly = toFriendlyChatError(raw);
      if (isProviderLimitError(raw)) {
        setLocalError(null);
        setOfflineReply(buildOfflineBaymaxReply(pendingUserInputRef.current));
        return;
      }
      setLocalError(friendly);
    },
  });

  const bookingMissingDetailPrompts = useMemo(
    () => buildBookingMissingDetailPrompts(messages),
    [messages],
  );

  const quickPrompts = useMemo(
    () => bookingMissingDetailPrompts ?? buildContextualQuickPrompts(messages),
    [messages, bookingMissingDetailPrompts],
  );

  const latestBookingDraftContext = useMemo(
    () => extractLatestBookingDraftContext(messages),
    [messages],
  );

  const searchSuggestions = useMemo(
    () => buildSearchSuggestions(messages, input, quickPrompts),
    [messages, input, quickPrompts],
  );

  const allMessages = useMemo(() => [starterBubble, ...messages], [messages]);
  const isThinking = status === "submitted" || status === "streaming";

  useEffect(() => {
    autoOpenTimerRef.current = setTimeout(() => {
      setIsOpen(true);
      autoOpenTimerRef.current = null;
    }, 7000);

    return () => {
      if (autoOpenTimerRef.current) {
        clearTimeout(autoOpenTimerRef.current);
        autoOpenTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [allMessages, isThinking]);

  const submitMessage = async (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return;

    const normalizedPrompt = trimmed.toLowerCase();
    const isCustomDatePrompt = normalizedPrompt === "custom date" || normalizedPrompt === "custom date and time";
    if (isCustomDatePrompt && latestBookingDraftContext?.restaurantId) {
      setBookingDraft({
        restaurantId: latestBookingDraftContext.restaurantId,
        date: latestBookingDraftContext.date,
        time: latestBookingDraftContext.time,
        partySize: latestBookingDraftContext.partySize,
      });
      setInput("");
      setIsOpen(true);
      setLocalError(null);
      setOfflineReply(null);
      return;
    }

    pendingUserInputRef.current = trimmed;

    if (autoOpenTimerRef.current) {
      clearTimeout(autoOpenTimerRef.current);
      autoOpenTimerRef.current = null;
    }

    setInput("");
    setIsOpen(true);
    setLocalError(null);
    setOfflineReply(null);
    try {
      await sendMessage({ text: trimmed }, { body: { userLocation } });
    } catch (err) {
      console.error("[Baymax] sendMessage failed:", err);
      const transportMessage = err instanceof Error ? err.message : "Baymax could not reach the reservation service right now.";
      if (isProviderLimitError(transportMessage)) {
        setLocalError(null);
        setOfflineReply(buildOfflineBaymaxReply(trimmed));
      } else {
        setLocalError(toFriendlyChatError(transportMessage));
      }
    }
  };

  const bookingRestaurant = useMemo(
    () => restaurants.find((r) => r.id === bookingDraft?.restaurantId) ?? null,
    [bookingDraft],
  );

  return (
    <>
      <div id="baymax-concierge" className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 pointer-events-none">
        {/* -- Chat window --------------------------------------------------- */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.94 }}
              transition={{ type: "spring", stiffness: 300, damping: 28 }}
              className="pointer-events-auto flex w-87.5 max-h-[min(680px,calc(100vh-4rem))] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[28px] border border-gray-200/80 bg-white shadow-[0_20px_60px_rgba(0,0,0,0.15),0_4px_16px_rgba(0,0,0,0.08)]"
            >
              {/* Header */}
              <div className="flex items-center justify-between bg-linear-to-br from-[#FF6B35] to-[#FF4F5A] px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                    <ChefHat className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-white">Baymax</p>
                    <p className="text-xs text-white/70">
                      {locationStatus === "ready" ? "Location-aware concierge" : "AI Dining Concierge"}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  title="Close chat"
                  aria-label="Close chat"
                  onClick={() => {
                    if (autoOpenTimerRef.current) {
                      clearTimeout(autoOpenTimerRef.current);
                      autoOpenTimerRef.current = null;
                    }
                    setIsOpen(false);
                  }}
                  className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white transition-all hover:bg-white/25 active:scale-95"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 max-h-85 space-y-3 overflow-y-auto px-4 py-4"
              >
                {allMessages.map((message) => (
                  <div key={message.id} className="space-y-3">
                    {(message.parts as MessagePart[]).map((part, idx) => {
                      if (part.type === "text" && part.text.trim()) {
                        const bubbleText = message.role === "assistant"
                          ? sanitizeDisplayedText(part.text)
                          : part.text;

                        return (
                          <div key={idx} className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}>
                            <div className={cn(
                              "max-w-[84%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
                              message.role === "user"
                                ? "bg-linear-to-br from-[#FF6B35] to-[#FF4F5A] text-white shadow-[0_4px_12px_rgba(255,107,53,0.25)]"
                                : "bg-gray-100 text-slate-800",
                            )}>
                              {bubbleText}
                            </div>
                          </div>
                        );
                      }

                      // -- AI SDK v6 older format: tool-invocation with state -
                      if (part.type === "tool-invocation") {
                        const inv = part as ToolInvocationPart;
                        if (inv.state === "call" || inv.state === "partial-call") {
                          return <ToolCallingBadge key={idx} toolName={inv.toolName} />;
                        }
                        if (inv.state === "result" && inv.result) {
                          return renderToolResult(inv.toolName, inv.result, idx, setBookingDraft);
                        }
                        return null;
                      }

                      // -- AI SDK v6 current format: tool-<name> / dynamic-tool -
                      if (isStaticToolUIPart(part)) {
                        const toolName = getStaticToolName(part);

                        if (part.state === "input-streaming" || part.state === "input-available" || part.state === "approval-requested") {
                          return <ToolCallingBadge key={idx} toolName={toolName} />;
                        }

                        if (part.state === "output-error") {
                          return <ToolErrorCard key={idx} title={toolName} message={part.errorText ?? "Baymax could not complete that action."} />;
                        }

                        if (part.state === "output-denied") {
                          return <ToolErrorCard key={idx} title={toolName} message="This tool action was denied before completion." />;
                        }

                        if (part.state === "output-available") {
                          return renderToolResult(toolName, part.output, idx, setBookingDraft);
                        }

                        return null;
                      }

                      if (part.type === "dynamic-tool") {
                        if (part.state === "input-streaming" || part.state === "input-available" || part.state === "approval-requested") {
                          return <ToolCallingBadge key={idx} toolName={part.toolName} />;
                        }

                        if (part.state === "output-error") {
                          return <ToolErrorCard key={idx} title={part.toolName} message={part.errorText ?? "Baymax could not complete that action."} />;
                        }

                        if (part.state === "output-denied") {
                          return <ToolErrorCard key={idx} title={part.toolName} message="This tool action was denied before completion." />;
                        }

                        if (part.state === "output-available") {
                          return renderToolResult(part.toolName, part.output, idx, setBookingDraft);
                        }

                        return null;
                      }

                      // -- AI SDK v4 legacy format (kept for compatibility) --
                      if (part.type === "tool-call") {
                        const hasResult = (message.parts as MessagePart[]).some(
                          (p) => p.type === "tool-result" && (p as ToolResultPart).toolCallId === (part as ToolCallPart).toolCallId,
                        );
                        if (hasResult) return null;
                        return <ToolCallingBadge key={idx} toolName={(part as ToolCallPart).toolName} />;
                      }
                      if (part.type === "tool-result") {
                        const r = part as ToolResultPart;
                        return renderToolResult(r.toolName, r.result ?? r.output, idx, setBookingDraft);
                      }
                      return null;
                    })}
                  </div>
                ))}

                {(error || localError) && (
                  !offlineReply && (
                  <div className="flex justify-start">
                    <div className="max-w-[84%] rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                      {localError ?? toFriendlyChatError(error?.message) ?? "Connection issue. Please try again."}
                    </div>
                  </div>
                  )
                )}

                {offlineReply && (
                  <div className="flex justify-start">
                    <div className="max-w-[84%] rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-700">
                      {offlineReply}
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
                <form onSubmit={(e) => { e.preventDefault(); void submitMessage(input); }} className="flex items-center gap-2">
                  <div className="flex flex-1 items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 focus-within:border-[#FF6B35] focus-within:bg-white transition-all">
                    <Sparkles className="h-3.5 w-3.5 shrink-0 text-[#FF6B35]" />
                    <input
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask for a perfect table..."
                      className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400"
                    />
                  </div>
                  <button
                    type="submit"
                    title="Send message"
                    aria-label="Send message"
                    disabled={!input.trim() || isThinking}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-[#FF6B35] text-white shadow-[0_4px_16px_rgba(255,107,53,0.35)] hover:shadow-[0_8px_24px_rgba(255,107,53,0.45)] active:scale-95 disabled:opacity-50 transition-all"
                  >
                    <SendHorizonal className="h-4 w-4" />
                  </button>
                </form>

                {input.trim() ? (
                  <div className="mt-2 overflow-hidden rounded-2xl border border-gray-200 bg-white">
                    {searchSuggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => void submitMessage(suggestion)}
                        className="flex w-full items-center justify-between border-b border-gray-100 px-3.5 py-2.5 text-left text-sm text-slate-700 transition-colors last:border-b-0 hover:bg-orange-50 hover:text-orange-700"
                      >
                        <span className="line-clamp-1">{suggestion}</span>
                        <span className="ml-3 text-[10px] uppercase tracking-[0.18em] text-slate-400">Suggest</span>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
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
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* -- FAB ----------------------------------------------------------- */}
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              type="button"
              onClick={() => {
                if (autoOpenTimerRef.current) {
                  clearTimeout(autoOpenTimerRef.current);
                  autoOpenTimerRef.current = null;
                }
                setIsOpen((v) => !v);
              }}
              whileTap={{ scale: 0.94 }}
              whileHover={{ scale: 1.06 }}
              initial={{ opacity: 0, scale: 0.9, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 8 }}
              transition={{ duration: 0.2 }}
              className="pointer-events-auto relative flex h-16 w-16 items-center justify-center rounded-[22px] bg-linear-to-br from-[#FF6B35] to-[#FF4F5A] text-white shadow-[0_8px_32px_rgba(255,107,53,0.45)] transition-shadow hover:shadow-[0_12px_40px_rgba(255,107,53,0.55)]"
            >
              {/* Pulse ring */}
              <motion.span
                className="absolute inset-0 rounded-[22px] border-2 border-[#FF6B35]"
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0, 0.6] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
              <motion.span
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <Bot className="h-6 w-6" />
              </motion.span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <BookingModal
        restaurant={bookingRestaurant}
        initialDate={bookingDraft?.date}
        initialTime={bookingDraft?.time}
        initialPartySize={bookingDraft?.partySize}
        isOpen={!!bookingDraft}
        onClose={() => setBookingDraft(null)}
      />
    </>
  );
}


