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

const initialRestaurants: MockRestaurant[] = [
  {
    id: "toit-brewery",
    name: "Toit Brewery",
    cuisine: "Craft Brewery & Gastropub",
    rating: 4.8,
    price_tier: "₹₹₹",
    location: "Kalyani Nagar, Pune",
    operating_hours: "12:00 PM - 01:00 AM",
    available_slots: ["19:00", "19:30", "20:00", "21:00", "21:30"],
  },
  {
    id: "mainland-china",
    name: "Mainland China",
    cuisine: "Contemporary Chinese",
    rating: 4.7,
    price_tier: "₹₹₹₹",
    location: "Boat Club Road, Camp, Pune",
    operating_hours: "12:00 PM - 03:00 PM, 07:00 PM - 11:30 PM",
    available_slots: ["19:00", "19:30", "20:00", "20:30", "21:30"],
  },
  {
    id: "11-east-street",
    name: "11 East Street",
    cuisine: "European All-day Bistro",
    rating: 4.6,
    price_tier: "₹₹₹",
    location: "East Street, Camp, Pune",
    operating_hours: "08:00 AM - 11:30 PM",
    available_slots: ["12:30", "13:00", "19:30", "20:00", "21:00"],
  },
  {
    id: "cafe-good-luck",
    name: "Cafe Good Luck",
    cuisine: "Iconic Irani Cafe",
    rating: 4.9,
    price_tier: "₹",
    location: "Deccan Gymkhana, Pune",
    operating_hours: "07:00 AM - 11:30 PM",
    available_slots: ["09:00", "13:00", "19:00", "19:30", "20:00"],
  },
  {
    id: "kalinga-seafood",
    name: "Kalinga",
    cuisine: "Coastal Seafood",
    rating: 4.5,
    price_tier: "₹₹",
    location: "Erandwane, Pune",
    operating_hours: "11:30 AM - 03:00 PM, 07:00 PM - 10:30 PM",
    available_slots: ["13:00", "19:00", "19:30", "20:00", "20:30"],
  },
  {
    id: "barometer",
    name: "Barometer",
    cuisine: "Modern Indian & Continental",
    rating: 4.6,
    price_tier: "₹₹₹",
    location: "Kothrud, Pune",
    operating_hours: "07:30 AM - 11:30 PM",
    available_slots: ["12:30", "19:30", "20:00", "20:30", "21:30"],
  },
];

function cloneRestaurant(restaurant: MockRestaurant): MockRestaurant {
  return {
    ...restaurant,
    available_slots: [...restaurant.available_slots],
  };
}

function normalizeTimeSlot(input: string): string {
  const value = input.trim().toLowerCase();

  const twentyFourMatch = value.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourMatch) {
    const rawHour = Number.parseInt(twentyFourMatch[1], 10);
    const minute = Number.parseInt(twentyFourMatch[2], 10);
    const hour = Math.max(0, Math.min(23, rawHour));
    const safeMinute = Math.max(0, Math.min(59, minute));
    return `${hour.toString().padStart(2, "0")}:${safeMinute.toString().padStart(2, "0")}`;
  }

  const twelveHourMatch = value.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (twelveHourMatch) {
    const rawHour = Number.parseInt(twelveHourMatch[1], 10);
    const minute = Number.parseInt(twelveHourMatch[2] ?? "00", 10);
    const meridiem = twelveHourMatch[3];
    const normalizedHour = rawHour % 12;
    const hour = meridiem === "pm" ? normalizedHour + 12 : normalizedHour;
    const safeMinute = Math.max(0, Math.min(59, minute));
    return `${hour.toString().padStart(2, "0")}:${safeMinute.toString().padStart(2, "0")}`;
  }

  return input;
}

type MockDbState = {
  restaurants: MockRestaurant[];
};

declare global {
  var __dineupMockDbState: MockDbState | undefined;
}

const state: MockDbState =
  globalThis.__dineupMockDbState ?? {
    restaurants: initialRestaurants.map(cloneRestaurant),
  };

globalThis.__dineupMockDbState = state;

export function getRestaurants(): MockRestaurant[] {
  return state.restaurants.map(cloneRestaurant);
}

export function getRestaurantById(restaurantId: string): MockRestaurant | null {
  const restaurant = state.restaurants.find((item) => item.id === restaurantId);
  return restaurant ? cloneRestaurant(restaurant) : null;
}

export function checkAvailability(restaurantId: string, time: string) {
  const normalizedSlot = normalizeTimeSlot(time);
  const restaurant = state.restaurants.find((item) => item.id === restaurantId);

  if (!restaurant) {
    return {
      ok: false,
      available: false,
      restaurantId,
      requestedSlot: normalizedSlot,
      remainingSlots: [] as string[],
      message: `Restaurant '${restaurantId}' not found.`,
    };
  }

  const available = restaurant.available_slots.includes(normalizedSlot);
  return {
    ok: true,
    available,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    requestedSlot: normalizedSlot,
    remainingSlots: [...restaurant.available_slots],
    message: available
      ? `${restaurant.name} has availability at ${normalizedSlot}.`
      : `${restaurant.name} is sold out at ${normalizedSlot}.`,
  };
}

export function bookTable(restaurantId: string, time: string, partySize: number) {
  const normalizedSlot = normalizeTimeSlot(time);
  const normalizedPartySize = Math.max(1, Math.floor(partySize));
  const restaurant = state.restaurants.find((item) => item.id === restaurantId);

  if (!restaurant) {
    return {
      ok: false,
      booked: false,
      restaurantId,
      requestedSlot: normalizedSlot,
      partySize: normalizedPartySize,
      remainingSlots: [] as string[],
      message: `Restaurant '${restaurantId}' not found.`,
    };
  }

  const slotIndex = restaurant.available_slots.indexOf(normalizedSlot);
  if (slotIndex < 0) {
    return {
      ok: true,
      booked: false,
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      requestedSlot: normalizedSlot,
      partySize: normalizedPartySize,
      remainingSlots: [...restaurant.available_slots],
      message: `${restaurant.name} no longer has ${normalizedSlot} available.`,
    };
  }

  restaurant.available_slots.splice(slotIndex, 1);

  return {
    ok: true,
    booked: true,
    restaurantId: restaurant.id,
    restaurantName: restaurant.name,
    requestedSlot: normalizedSlot,
    partySize: normalizedPartySize,
    remainingSlots: [...restaurant.available_slots],
    message: `Booked ${restaurant.name} at ${normalizedSlot} for ${normalizedPartySize} ${normalizedPartySize === 1 ? "guest" : "guests"}.`,
  };
}
