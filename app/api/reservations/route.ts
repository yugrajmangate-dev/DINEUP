import { NextResponse } from "next/server";

import { createBooking, getRestaurantAvailability } from "@/lib/platform-db";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const restaurantId = searchParams.get("restaurantId");
  const date = searchParams.get("date");
  const partySize = Number.parseInt(searchParams.get("partySize") ?? "2", 10);
  const time = searchParams.get("time") ?? undefined;

  if (!restaurantId || !date) {
    return NextResponse.json({ error: "restaurantId and date are required." }, { status: 400 });
  }

  const availability = await getRestaurantAvailability(
    restaurantId,
    date,
    Number.isNaN(partySize) ? 2 : partySize,
    time,
  );

  if (!availability) {
    return NextResponse.json({ error: "Restaurant not found." }, { status: 404 });
  }

  return NextResponse.json({
    restaurantId: availability.restaurant.id,
    name: availability.restaurant.name,
    slots: availability.slots,
    tables: availability.tables,
    operatingHours: availability.restaurant.operating_hours,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as {
    restaurantId?: string;
    date?: string;
    time?: string;
    partySize?: number;
    tableId?: string;
    customerName?: string;
    userId?: string;
  };

  if (!body.restaurantId || !body.date || !body.time || !body.partySize || !body.tableId) {
    return NextResponse.json(
      { error: "restaurantId, date, time, partySize, and tableId are required." },
      { status: 400 },
    );
  }

  const result = await createBooking({
    restaurantId: body.restaurantId,
    date: body.date,
    time: body.time,
    partySize: body.partySize,
    tableId: body.tableId,
    customerName: body.customerName,
    userId: body.userId,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.message }, { status: result.status });
  }

  if (!result.booking) {
    return NextResponse.json({ error: "Booking could not be created." }, { status: 500 });
  }

  const booking = result.booking;

  return NextResponse.json({
    booked: true,
    message: `Booked ${booking.restaurantName} at ${booking.time} on ${booking.date}.`,
    booking,
  });
}
