import fs from "fs";
import path from "path";

import { restaurants as seedRestaurants } from "@/lib/restaurants";

export type PriceTier = "₹" | "₹₹" | "₹₹₹" | "₹₹₹₹";

export type MockRestaurant = {
  id: string;
  name: string;
  cuisine: string;
  rating: number;
  price_tier: PriceTier;
  location: string;
  operating_hours: string;
  available_slots: string[];
};

const DB_PATH = path.join(process.cwd(), "data", "platform-db.json");

function ensureFile() {
  if (fs.existsSync(DB_PATH)) return;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  fs.writeFileSync(
    DB_PATH,
    JSON.stringify({
      restaurants: seedRestaurants.map((restaurant) => ({
        ...restaurant,
        tables: [
          { id: `${restaurant.id}-t1`, name: "Window 1", capacity: 2, zone: "Window" },
          { id: `${restaurant.id}-t2`, name: "Patio 1", capacity: 4, zone: "Patio" },
        ],
        tour: {
          headline: `Preview ${restaurant.name} before you book.`,
          nodes: [
            {
              id: `${restaurant.id}-arrival`,
              name: "Arrival",
              panorama: restaurant.image,
              thumbnail: restaurant.image,
            },
          ],
        },
      })),
      bookings: [],
    }, null, 2),
    "utf8",
  );
}

function readDb() {
  ensureFile();
  return JSON.parse(fs.readFileSync(DB_PATH, "utf8")) as {
    restaurants: Array<{
      id: string;
      name: string;
      cuisine: string;
      rating: number;
      price: PriceTier;
      address: string;
      operating_hours: Array<{ day: string; hours: string }>;
      reservationSlots: string[];
      tables?: Array<{ id: string; name: string; capacity: number }>;
    }>;
    bookings: Array<{
      restaurantId: string;
      date: string;
      time: string;
      tableId: string;
    }>;
  };
}

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function toMockRestaurant(entry: ReturnType<typeof readDb>["restaurants"][number]): MockRestaurant {
  const bookingsToday = readDb().bookings.filter((booking) => booking.restaurantId === entry.id && booking.date === todayIso());
  const available_slots = entry.reservationSlots.filter((slot) =>
    (entry.tables ?? []).some((table) => !bookingsToday.some((booking) => booking.time === slot && booking.tableId === table.id)),
  );

  return {
    id: entry.id,
    name: entry.name,
    cuisine: entry.cuisine,
    rating: entry.rating,
    price_tier: entry.price,
    location: entry.address,
    operating_hours: entry.operating_hours.map((item) => `${item.day}: ${item.hours}`).join(", "),
    available_slots,
  };
}

export function getRestaurants(): MockRestaurant[] {
  const db = readDb();
  return db.restaurants.map(toMockRestaurant);
}

export function getRestaurantById(restaurantId: string): MockRestaurant | null {
  return getRestaurants().find((restaurant) => restaurant.id === restaurantId) ?? null;
}

export function checkAvailability(restaurantId: string, time: string) {
  const restaurant = getRestaurantById(restaurantId);
  if (!restaurant) {
    return {
      ok: false,
      available: false,
      restaurantId,
      requestedSlot: time,
      remainingSlots: [] as string[],
      message: `Restaurant '${restaurantId}' not found.`,
    };
  }

  const available = restaurant.available_slots.includes(time);
  return {
    ok: true,
    available,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    requestedSlot: time,
    remainingSlots: restaurant.available_slots,
    message: available
      ? `${restaurant.name} has availability at ${time}.`
      : `${restaurant.name} is sold out at ${time}.`,
  };
}

export function bookTable(restaurantId: string, time: string, partySize: number) {
  const restaurant = getRestaurantById(restaurantId);
  if (!restaurant) {
    return {
      ok: false,
      booked: false,
      restaurantId,
      requestedSlot: time,
      partySize,
      remainingSlots: [] as string[],
      message: `Restaurant '${restaurantId}' not found.`,
    };
  }

  if (!restaurant.available_slots.includes(time)) {
    return {
      ok: true,
      booked: false,
      restaurantId,
      requestedSlot: time,
      partySize,
      remainingSlots: restaurant.available_slots,
      message: `${restaurant.name} no longer has ${time} available.`,
    };
  }

  return {
    ok: true,
    booked: true,
    restaurantId,
    restaurantName: restaurant.name,
    requestedSlot: time,
    partySize,
    remainingSlots: restaurant.available_slots.filter((slot) => slot !== time),
    message: `Draft booking prepared for ${restaurant.name} at ${time}.`,
  };
}
