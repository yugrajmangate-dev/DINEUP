import { collection, getDocs, orderBy, query, where } from "firebase/firestore";

import { db } from "@/lib/firebase";

export type UserBooking = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  neighborhood: string;
  date: string;
  time: string;
  partySize: number;
  status: "confirmed" | "cancelled";
  createdAt: { seconds: number } | null;
};

type CacheEntry = {
  data: UserBooking[];
  timestamp: number;
};

const CACHE_TTL_MS = 60_000;
const memoryCache = new Map<string, CacheEntry>();
const inFlight = new Map<string, Promise<UserBooking[]>>();

function storageKey(userId: string) {
  return `dineup:bookings:${userId}`;
}

function readFromSession(userId: string): CacheEntry | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || !Array.isArray(parsed.data) || typeof parsed.timestamp !== "number") {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
}

function writeToSession(userId: string, entry: CacheEntry) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(storageKey(userId), JSON.stringify(entry));
  } catch {
    // Ignore storage write failures (quota/private mode).
  }
}

function isFresh(entry: CacheEntry) {
  return Date.now() - entry.timestamp < CACHE_TTL_MS;
}

export function getCachedUserBookings(userId: string): UserBooking[] | null {
  const memoryEntry = memoryCache.get(userId);
  if (memoryEntry && isFresh(memoryEntry)) {
    return memoryEntry.data;
  }

  const sessionEntry = readFromSession(userId);
  if (sessionEntry && isFresh(sessionEntry)) {
    memoryCache.set(userId, sessionEntry);
    return sessionEntry.data;
  }

  return null;
}

export function setCachedUserBookings(userId: string, bookings: UserBooking[]) {
  const entry: CacheEntry = { data: bookings, timestamp: Date.now() };
  memoryCache.set(userId, entry);
  writeToSession(userId, entry);
}

export async function fetchUserBookings(userId: string, forceRefresh = false): Promise<UserBooking[]> {
  if (!forceRefresh) {
    const cached = getCachedUserBookings(userId);
    if (cached) return cached;
  }

  const pending = inFlight.get(userId);
  if (pending) return pending;

  const request = (async () => {
    const snapshot = await getDocs(query(
      collection(db, "bookings"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc"),
    ));

    const docs = snapshot.docs.map((docSnap) => ({
      id: docSnap.id,
      ...(docSnap.data() as Omit<UserBooking, "id">),
    }));

    setCachedUserBookings(userId, docs);
    return docs;
  })();

  inFlight.set(userId, request);

  try {
    return await request;
  } finally {
    inFlight.delete(userId);
  }
}
