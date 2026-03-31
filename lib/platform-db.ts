import "server-only";

import { promises as fs } from "fs";
import path from "path";

import { restaurants as seedRestaurants, type Restaurant, type RestaurantTable } from "@/lib/restaurants";

export type BookingRecord = {
  id: string;
  restaurantId: string;
  restaurantName: string;
  date: string;
  time: string;
  partySize: number;
  tableId: string;
  tableName: string;
  createdAt: string;
  customerName?: string;
  userId?: string;
};

type PlatformDatabase = {
  restaurants: Restaurant[];
  bookings: BookingRecord[];
};

const DATA_DIR = process.env.PLATFORM_DB_DIR || path.join(process.cwd(), "data");
const DB_PATH = process.env.PLATFORM_DB_PATH || path.join(DATA_DIR, "platform-db.json");

function buildSampleTables(restaurantId: string): RestaurantTable[] {
  return [
    { id: `${restaurantId}-t1`, name: "Window 1", capacity: 2, zone: "Window" },
    { id: `${restaurantId}-t2`, name: "Window 2", capacity: 4, zone: "Window" },
    { id: `${restaurantId}-t3`, name: "Patio 1", capacity: 4, zone: "Patio" },
    { id: `${restaurantId}-t4`, name: "Chef Table", capacity: 6, zone: "Main Hall" },
  ];
}

function buildSeedRestaurant(restaurant: Restaurant): Restaurant {
  return {
    ...restaurant,
    tables: buildSampleTables(restaurant.id),
    tour: {
      headline: `Preview ${restaurant.name} before you book.`,
      nodes: [
        {
          id: `${restaurant.id}-arrival`,
          name: "Arrival",
          panorama: restaurant.image,
          thumbnail: restaurant.image,
          description: `Public preview for ${restaurant.name}. Replace with real 360 panoramas from admin.`,
        },
      ],
    },
  };
}

async function ensureDb() {
  await fs.mkdir(DATA_DIR, { recursive: true });

  try {
    await fs.access(DB_PATH);
  } catch {
    const seed: PlatformDatabase = {
      restaurants: seedRestaurants.map(buildSeedRestaurant),
      bookings: [],
    };
    await fs.writeFile(DB_PATH, JSON.stringify(seed, null, 2), "utf8");
  }
}

async function readDb(): Promise<PlatformDatabase> {
  await ensureDb();
  const raw = await fs.readFile(DB_PATH, "utf8");
  return JSON.parse(raw) as PlatformDatabase;
}

async function writeDb(db: PlatformDatabase) {
  await ensureDb();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf8");
}

function normalizeTextList(value: string | string[] | undefined) {
  if (Array.isArray(value)) return value.map((item) => item.trim()).filter(Boolean);
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export async function listPlatformRestaurants() {
  const db = await readDb();
  return db.restaurants;
}

export async function getPlatformRestaurantById(id: string) {
  const db = await readDb();
  return db.restaurants.find((restaurant) => restaurant.id === id) ?? null;
}

export async function getRestaurantAvailability(restaurantId: string, date: string, partySize: number, time?: string) {
  const db = await readDb();
  const restaurant = db.restaurants.find((entry) => entry.id === restaurantId);
  if (!restaurant) return null;

  const qualifiedTables = (restaurant.tables ?? []).filter((table) => table.capacity >= partySize);
  const availableSlots = restaurant.reservationSlots.filter((slot) =>
    qualifiedTables.some((table) =>
      !db.bookings.some((booking) =>
        booking.restaurantId === restaurantId
        && booking.date === date
        && booking.time === slot
        && booking.tableId === table.id,
      ),
    ),
  );

  const availableTables = time
    ? qualifiedTables.filter((table) =>
      !db.bookings.some((booking) =>
        booking.restaurantId === restaurantId
        && booking.date === date
        && booking.time === time
        && booking.tableId === table.id,
      ),
    )
    : [];

  return {
    restaurant,
    slots: availableSlots,
    tables: availableTables,
  };
}

export async function createRestaurant(input: {
  name: string;
  neighborhood: string;
  cuisine: string;
  description: string;
  image: string;
  coordinates: [number, number];
  rating?: number;
  distance?: string;
  price: Restaurant["price"];
  tags?: string | string[];
  vibe?: string;
  icon?: Restaurant["icon"];
  layout?: Restaurant["layout"];
  reservationSlots?: string | string[];
  phone?: string;
  website?: string;
  address?: string;
  dietaryTags?: string | string[];
  tourNodes?: Array<{ name: string; panorama: string }>;
  tables?: Array<{ name: string; capacity: number; zone: string }>;
}) {
  const db = await readDb();
  const baseId = input.name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const id = db.restaurants.some((restaurant) => restaurant.id === baseId)
    ? `${baseId}-${Date.now()}`
    : baseId;

  const tables = (input.tables ?? []).map((table, index) => ({
    id: `${id}-table-${index + 1}`,
    name: table.name,
    capacity: Math.max(1, Math.floor(table.capacity)),
    zone: table.zone,
  }));

  const restaurant: Restaurant = {
    id,
    name: input.name.trim(),
    neighborhood: input.neighborhood.trim(),
    cuisine: input.cuisine.trim(),
    description: input.description.trim(),
    image: input.image.trim(),
    food_images: [input.image.trim()],
    coordinates: input.coordinates,
    rating: input.rating ?? 4.5,
    distance: input.distance ?? "Available on request",
    price: input.price,
    tags: normalizeTextList(input.tags),
    vibe: input.vibe?.trim() || "Curated experience",
    icon: input.icon ?? "sparkles",
    layout: input.layout ?? "regular",
    reservationSlots: normalizeTextList(input.reservationSlots).length
      ? normalizeTextList(input.reservationSlots)
      : ["19:00", "20:00", "21:00"],
    phone: input.phone?.trim() || "",
    website: input.website?.trim() || "",
    address: input.address?.trim() || "",
    operating_hours: [{ day: "Mon-Sun", hours: "12:00 PM - 11:00 PM" }],
    dietary_tags: normalizeTextList(input.dietaryTags) as Restaurant["dietary_tags"],
    tables: tables.length ? tables : buildSampleTables(id),
    tour: {
      headline: `Preview ${input.name.trim()} before you book.`,
      nodes: (input.tourNodes ?? [])
        .filter((node) => node.name.trim() && node.panorama.trim())
        .map((node, index) => ({
          id: `${id}-tour-${index + 1}`,
          name: node.name.trim(),
          panorama: node.panorama.trim(),
          thumbnail: node.panorama.trim(),
        })),
    },
  };

  db.restaurants.unshift(restaurant);
  await writeDb(db);
  return restaurant;
}

export async function createBooking(input: {
  restaurantId: string;
  date: string;
  time: string;
  partySize: number;
  tableId: string;
  customerName?: string;
  userId?: string;
}) {
  const db = await readDb();
  const restaurant = db.restaurants.find((entry) => entry.id === input.restaurantId);
  if (!restaurant) {
    return { ok: false, status: 404, message: "Restaurant not found." };
  }

  const table = (restaurant.tables ?? []).find((entry) => entry.id === input.tableId);
  if (!table) {
    return { ok: false, status: 404, message: "Table not found." };
  }

  if (table.capacity < input.partySize) {
    return { ok: false, status: 409, message: `${table.name} cannot seat ${input.partySize} guests.` };
  }

  const taken = db.bookings.find((booking) =>
    booking.restaurantId === input.restaurantId
    && booking.date === input.date
    && booking.time === input.time
    && booking.tableId === input.tableId,
  );

  if (taken) {
    return { ok: false, status: 409, message: `${table.name} is no longer available for ${input.time}.` };
  }

  const booking: BookingRecord = {
    id: `${input.restaurantId}-${Date.now()}`,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    date: input.date,
    time: input.time,
    partySize: input.partySize,
    tableId: table.id,
    tableName: table.name,
    customerName: input.customerName,
    userId: input.userId,
    createdAt: new Date().toISOString(),
  };

  db.bookings.unshift(booking);
  await writeDb(db);

  return {
    ok: true,
    status: 200,
    booking,
  };
}

export async function updateRestaurantTour(
  id: string,
  tour: { headline: string; nodes: any[] }
) {
  const db = await readDb();
  const idx = db.restaurants.findIndex((r) => r.id === id);
  if (idx === -1) return null;

  db.restaurants[idx].tour = {
    headline: tour.headline,
    nodes: tour.nodes.map((node: any) => ({
      id: node.id,
      name: node.name,
      panorama: node.panorama,
      thumbnail: node.thumbnail || node.panorama,
      description: node.description || "",
      links: node.links || [],
      markers: node.markers || [],
      position: node.position || { x: 0, y: 0, z: 0 },
    })),
  };

  await writeDb(db);
  return db.restaurants[idx];
}

