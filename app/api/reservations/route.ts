import { NextResponse } from "next/server";

import { bookTable, getRestaurantById } from "@/lib/mock-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");

  if (!restaurantId) {
    return NextResponse.json({ error: "restaurantId is required." }, { status: 400 });
  }

  const restaurant = getRestaurantById(restaurantId);
  if (!restaurant) {
    return NextResponse.json({ error: `Restaurant '${restaurantId}' not found.` }, { status: 404 });
  }

  return NextResponse.json({
    restaurantId: restaurant.id,
    name: restaurant.name,
    operatingHours: restaurant.operating_hours,
    slots: restaurant.available_slots,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    restaurantId?: string;
    time?: string;
    partySize?: number;
  };

  if (!body.restaurantId || !body.time || !body.partySize) {
    return NextResponse.json(
      { error: "restaurantId, time, and partySize are required." },
      { status: 400 },
    );
  }

  const result = bookTable(body.restaurantId, body.time, body.partySize);

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: 404 });
  }

  if (!result.booked) {
    return NextResponse.json(
      {
        booked: false,
        message: result.message,
        remainingSlots: result.remainingSlots,
      },
      { status: 409 },
    );
  }

  return NextResponse.json({
    booked: true,
    message: result.message,
    bookedSlot: result.requestedSlot,
    partySize: result.partySize,
    remainingSlots: result.remainingSlots,
  });
}
