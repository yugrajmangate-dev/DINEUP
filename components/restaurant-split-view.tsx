"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import Map, {
  FullscreenControl,
  Marker,
  NavigationControl,
  Popup,
  type MapRef,
} from "react-map-gl/mapbox";
import {
  ArrowUpRight,
  CalendarDays,
  Coffee,
  Leaf,
  LocateFixed,
  MapPinned,
  Sparkles,
  Star,
} from "lucide-react";

import { BookingModal } from "@/components/booking-modal";
import type { UserLocation } from "@/lib/geo";
import { calculateDistanceKm, formatDistanceLabel } from "@/lib/geo";
import type { GeolocationStatus } from "@/hooks/use-geolocation";
import type { Restaurant, RestaurantIcon } from "@/lib/restaurants";
import { cn } from "@/lib/utils";

const iconMap: Record<RestaurantIcon, typeof Leaf> = {
  leaf: Leaf,
  coffee: Coffee,
  sparkles: Sparkles,
};

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

type RestaurantWithDistance = {
  restaurant: Restaurant;
  distanceKm: number | null;
  distanceLabel: string;
};

type RestaurantSplitViewProps = {
  restaurants: Restaurant[];
  userLocation: UserLocation | null;
  locationStatus: GeolocationStatus;
  locationError: string | null;
  onRequestLocation: () => void;
};

export function RestaurantSplitView({
  restaurants,
  userLocation,
  locationStatus,
  locationError,
  onRequestLocation,
}: RestaurantSplitViewProps) {
  const [activeRestaurantId, setActiveRestaurantId] = useState(restaurants[0]?.id);
  const [bookingRestaurantId, setBookingRestaurantId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<"auto" | "manual">("auto");

  const restaurantsWithDistance = useMemo<RestaurantWithDistance[]>(() => {
    const mappedRestaurants = restaurants.map((restaurant) => {
      const distanceKm = userLocation
        ? calculateDistanceKm(userLocation, {
            latitude: restaurant.coordinates[1],
            longitude: restaurant.coordinates[0],
          })
        : null;

      return {
        restaurant,
        distanceKm,
        distanceLabel:
          distanceKm !== null ? formatDistanceLabel(distanceKm) : restaurant.distance,
      };
    });

    return mappedRestaurants.sort((left, right) => {
      if (left.distanceKm === null && right.distanceKm === null) {
        return restaurants.findIndex((restaurant) => restaurant.id === left.restaurant.id) -
          restaurants.findIndex((restaurant) => restaurant.id === right.restaurant.id);
      }

      if (left.distanceKm === null) {
        return 1;
      }

      if (right.distanceKm === null) {
        return -1;
      }

      return left.distanceKm - right.distanceKm;
    });
  }, [restaurants, userLocation]);

  const activeRestaurant = useMemo(() => {
    if (selectionMode === "auto") {
      return restaurantsWithDistance[0];
    }

    return (
      restaurantsWithDistance.find(
        ({ restaurant }) => restaurant.id === activeRestaurantId,
      ) ?? restaurantsWithDistance[0]
    );
  }, [activeRestaurantId, restaurantsWithDistance, selectionMode]);

  const bookingRestaurant = useMemo(
    () =>
      restaurants.find((restaurant) => restaurant.id === bookingRestaurantId) ?? null,
    [bookingRestaurantId, restaurants],
  );

  const selectRestaurant = (restaurantId: string, mode: "auto" | "manual" = "manual") => {
    setSelectionMode(mode);
    setActiveRestaurantId(restaurantId);
  };

  return (
    <>
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.38fr)]">
        <div className="glass-panel rounded-4xl border p-4 sm:p-5">
          <div className="flex flex-col gap-4 border-b border-white/8 px-2 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">
                  Interactive feed
                </p>
                <h2 className="mt-1 font-display text-2xl tracking-wide text-white">
                  Curated List
                </h2>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-zinc-400 sm:flex">
                <MapPinned className="h-4 w-4 text-accent" />
                Hover a card to animate its live pin.
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={onRequestLocation}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-accent/30 hover:bg-accent/10 hover:text-white active:scale-95"
              >
                <LocateFixed className="h-4 w-4 text-accent" />
                {locationStatus === "ready" ? "Location synced" : "Use my location"}
              </button>

              <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-sm text-zinc-400">
                {locationStatus === "ready"
                  ? "Sorted by live proximity around Pune."
                  : locationStatus === "requesting"
                    ? "Requesting precise location..."
                    : locationError ?? "Grant access to sort restaurants by distance."}
              </div>
            </div>
          </div>

          <motion.div
            className="mt-5 grid max-h-[calc(100vh-19rem)] gap-4 overflow-y-auto pr-1 xl:grid-cols-2"
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {restaurantsWithDistance.map((entry) => (
              <RestaurantCard
                key={entry.restaurant.id}
                restaurant={entry.restaurant}
                distanceLabel={entry.distanceLabel}
                isActive={entry.restaurant.id === activeRestaurant?.restaurant.id}
                onHover={() => selectRestaurant(entry.restaurant.id)}
                onBookNow={() => setBookingRestaurantId(entry.restaurant.id)}
              />
            ))}
          </motion.div>
        </div>

        <MapPanel
          activeRestaurant={activeRestaurant}
          locationStatus={locationStatus}
          onRequestLocation={onRequestLocation}
          restaurants={restaurantsWithDistance}
          selectionMode={selectionMode}
          setActiveRestaurantId={selectRestaurant}
          userLocation={userLocation}
        />
      </section>

      <BookingModal
        restaurant={bookingRestaurant}
        distanceLabel={
          restaurantsWithDistance.find(
            ({ restaurant }) => restaurant.id === bookingRestaurant?.id,
          )?.distanceLabel
        }
        isOpen={Boolean(bookingRestaurant)}
        onClose={() => setBookingRestaurantId(null)}
      />
    </>
  );
}

type RestaurantCardProps = {
  restaurant: Restaurant;
  distanceLabel: string;
  isActive: boolean;
  onHover: () => void;
  onBookNow: () => void;
};

function RestaurantCard({
  restaurant,
  distanceLabel,
  isActive,
  onHover,
  onBookNow,
}: RestaurantCardProps) {
  const Icon = iconMap[restaurant.icon];
  const [imageReady, setImageReady] = useState(false);

  return (
    <motion.article
      variants={cardVariants}
      onHoverStart={onHover}
      onFocusCapture={onHover}
      className={cn(
        "group relative overflow-hidden rounded-[28px] border border-white/5 bg-[#121212]/90 transition-all duration-500 ease-out hover:border-accent/30 hover:shadow-[0_20px_60px_rgba(255,107,107,0.15)]",
        restaurant.layout === "wide" && "xl:col-span-2",
        restaurant.layout === "tall" && "min-h-[22rem]",
        isActive && "border-accent/40 shadow-[0_24px_70px_rgba(255,107,107,0.1)]",
      )}
      whileHover={{ y: -8, scale: 1.01 }}
    >
      <div className="relative min-h-80">
        {!imageReady && <div className="shimmer absolute inset-0 z-10" />}
        <Image
          src={restaurant.image}
          alt={restaurant.name}
          fill
          className="object-cover transition-all duration-500 ease-out group-hover:scale-[1.04]"
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 35vw, 100vw"
          onLoad={() => setImageReady(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />

        <div className="absolute left-5 right-5 top-5 z-20 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/40 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-md">
            {distanceLabel}
          </span>
        </div>

        <div className="absolute bottom-0 left-0 right-0 z-20 p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-accent backdrop-blur-md">
                <Icon className="h-3 w-3" />
                {restaurant.cuisine}
              </div>
              <div>
                <h3 className="font-display text-3xl leading-tight text-white">{restaurant.name}</h3>
                <p className="mt-0.5 text-sm text-zinc-300">{restaurant.neighborhood}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/40 px-3 py-2 text-right backdrop-blur-md">
              <div className="flex items-center gap-1 text-white">
                <Star className="h-4 w-4 fill-accent text-accent" />
                <span className="text-sm font-semibold">{restaurant.rating.toFixed(1)}</span>
              </div>
              <p className="mt-1 text-[10px] uppercase tracking-wider text-zinc-400">{restaurant.price}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {restaurant.dietary_tags.slice(0, 2).map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/5 bg-white/5 px-2.5 py-1 text-[10px] uppercase tracking-wider text-zinc-400"
                >
                  {tag}
                </span>
              ))}
            </div>

            <motion.button
              type="button"
              onClick={onBookNow}
              className="inline-flex h-11 items-center justify-center gap-2 overflow-hidden rounded-full bg-accent px-5 text-sm font-semibold text-black shadow-[0_12px_32px_rgba(255,107,107,0.24)] active:scale-95"
              animate={{ width: isActive ? 140 : 110 }}
              transition={{ type: "spring", stiffness: 280, damping: 22 }}
            >
              Reserve
              <ArrowUpRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </motion.button>
          </div>
        </div>
      </div>
    </motion.article>
  );
}

type MapPanelProps = {
  activeRestaurant: RestaurantWithDistance;
  locationStatus: GeolocationStatus;
  onRequestLocation: () => void;
  restaurants: RestaurantWithDistance[];
  selectionMode: "auto" | "manual";
  setActiveRestaurantId: (id: string, mode?: "auto" | "manual") => void;
  userLocation: UserLocation | null;
};

function MapPanel({
  activeRestaurant,
  locationStatus,
  onRequestLocation,
  restaurants,
  selectionMode,
  setActiveRestaurantId,
  userLocation,
}: MapPanelProps) {
  const mapRef = useRef<MapRef | null>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!mapRef.current || !activeRestaurant) {
      return;
    }

    if (userLocation && selectionMode === "auto") {
      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 13.8,
        duration: 1800,
        essential: true,
        easing: (value) => value * value * (3 - 2 * value),
      });
      return;
    }

    mapRef.current.flyTo({
      center: activeRestaurant.restaurant.coordinates,
      zoom: 13.3,
      duration: 1200,
      essential: true,
    });
  }, [activeRestaurant, selectionMode, userLocation]);

  if (!token) {
    return (
      <div className="glass-panel sticky top-24 flex min-h-180 flex-col overflow-hidden rounded-4xl border p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Map preview</p>
            <h3 className="mt-2 font-display text-3xl text-white">Connect Mapbox to go live</h3>
          </div>
          <div className="rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-accent">
            Add NEXT_PUBLIC_MAPBOX_TOKEN
          </div>
        </div>

        <div className="relative mt-6 flex-1 overflow-hidden rounded-[28px] border border-white/8 bg-[radial-gradient(circle_at_top,rgba(255,107,107,0.16),transparent_28%),linear-gradient(135deg,rgba(255,255,255,0.06),rgba(255,255,255,0.02))]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-size-[72px_72px]" />
          {restaurants.map(({ restaurant, distanceLabel }, index) => {
            const left = 18 + ((index * 13) % 60);
            const top = 18 + ((index * 17) % 58);
            const Icon = iconMap[restaurant.icon];
            const isActive = restaurant.id === activeRestaurant.restaurant.id;

            return (
              <motion.button
                key={restaurant.id}
                className={cn(
                  "absolute rounded-full border px-3 py-2 text-left backdrop-blur-md",
                  isActive
                    ? "border-accent/40 bg-accent text-black"
                    : "border-white/10 bg-black/40 text-white",
                )}
                style={{ left: `${left}%`, top: `${top}%` }}
                onMouseEnter={() => setActiveRestaurantId(restaurant.id)}
                whileHover={{ y: -4, scale: 1.04 }}
                animate={
                  isActive
                    ? { y: [0, -8, 0], scale: [1, 1.08, 1] }
                    : { y: 0, scale: 1 }
                }
                transition={{ repeat: isActive ? Number.POSITIVE_INFINITY : 0, duration: 1.6 }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Icon className="h-3.5 w-3.5" />
                  {distanceLabel}
                </div>
              </motion.button>
            );
          })}

          <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-white/8 bg-black/55 p-5 backdrop-blur-xl">
            <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Ready when you are</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h4 className="font-display text-3xl text-white">{activeRestaurant.restaurant.name}</h4>
                <p className="mt-1 text-sm text-zinc-400">{activeRestaurant.restaurant.neighborhood} · {activeRestaurant.restaurant.cuisine}</p>
              </div>
              {locationStatus === "ready" ? (
                <div className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-zinc-300">
                  <LocateFixed className="h-4 w-4 text-accent" />
                  Live distance sync is active.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-4 py-2 text-sm text-zinc-300 hover:border-accent/30 hover:bg-accent/10 hover:text-white active:scale-95"
                >
                  <CalendarDays className="h-4 w-4 text-accent" />
                  Enable proximity sorting.
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel sticky top-24 min-h-180 overflow-hidden rounded-4xl border p-3">
      <div className="relative h-[calc(100vh-8rem)] min-h-170 overflow-hidden rounded-[28px] border border-white/8">
        <Map
          ref={mapRef}
          reuseMaps
          initialViewState={{
            longitude: activeRestaurant.restaurant.coordinates[0],
            latitude: activeRestaurant.restaurant.coordinates[1],
            zoom: 12.8,
          }}
          mapboxAccessToken={token}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          attributionControl={false}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <FullscreenControl position="top-right" />

          {userLocation && (
            <Marker
              longitude={userLocation.longitude}
              latitude={userLocation.latitude}
              anchor="center"
            >
              <div className="relative flex h-5 w-5 items-center justify-center">
                <span className="absolute h-5 w-5 rounded-full bg-accent/30 animate-[pulse-ring_1.8s_ease-out_infinite]" />
                <span className="relative h-3.5 w-3.5 rounded-full border border-white/50 bg-accent" />
              </div>
            </Marker>
          )}

          {restaurants.map(({ restaurant }) => {
            const Icon = iconMap[restaurant.icon];
            const isActive = restaurant.id === activeRestaurant.restaurant.id;

            return (
              <Marker
                key={restaurant.id}
                longitude={restaurant.coordinates[0]}
                latitude={restaurant.coordinates[1]}
                anchor="bottom"
              >
                <motion.button
                  type="button"
                  onMouseEnter={() => setActiveRestaurantId(restaurant.id)}
                  onClick={() => setActiveRestaurantId(restaurant.id)}
                  className="relative flex items-center justify-center"
                  animate={
                    isActive
                      ? {
                          scale: [1, 1.14, 1],
                          y: [0, -9, 0],
                        }
                      : { scale: 1, y: 0 }
                  }
                  transition={{
                    duration: 1.5,
                    repeat: isActive ? Number.POSITIVE_INFINITY : 0,
                    ease: "easeInOut",
                  }}
                >
                  {isActive && (
                    <span className="absolute h-12 w-12 rounded-full border border-accent/40 bg-accent/10 animate-[pulse-ring_1.5s_ease-out_infinite]" />
                  )}
                  <span
                    className={cn(
                      "relative flex min-w-14.5 items-center gap-2 rounded-full border px-3 py-2 text-sm font-semibold shadow-[0_16px_40px_rgba(0,0,0,0.35)]",
                      isActive
                        ? "border-accent/60 bg-accent text-black"
                        : "border-white/10 bg-[#121212]/95 text-white",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {restaurant.rating.toFixed(1)}
                  </span>
                </motion.button>
              </Marker>
            );
          })}

          <Popup
            longitude={activeRestaurant.restaurant.coordinates[0]}
            latitude={activeRestaurant.restaurant.coordinates[1]}
            anchor="top"
            closeButton={false}
            closeOnClick={false}
            offset={24}
          >
            <div className="w-70 overflow-hidden rounded-[20px] bg-[#121212]">
              <div className="relative h-36 w-full">
                <Image
                  src={activeRestaurant.restaurant.image}
                  alt={activeRestaurant.restaurant.name}
                  fill
                  className="object-cover"
                  sizes="280px"
                />
                <div className="absolute inset-0 bg-linear-to-t from-black via-black/20 to-transparent" />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="font-display text-2xl text-white">{activeRestaurant.restaurant.name}</h4>
                    <p className="text-sm text-zinc-400">{activeRestaurant.restaurant.neighborhood}</p>
                  </div>
                  <span className="rounded-full bg-accent/15 px-3 py-1 text-xs font-semibold text-accent">
                    {activeRestaurant.restaurant.rating.toFixed(1)}
                  </span>
                </div>
                <p className="text-sm leading-6 text-zinc-400">{activeRestaurant.restaurant.description}</p>
                <p className="text-xs uppercase tracking-[0.22em] text-zinc-500">
                  {activeRestaurant.distanceLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {activeRestaurant.restaurant.reservationSlots.map((slot) => (
                    <span
                      key={slot}
                      className="rounded-full border border-white/8 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                    >
                      {slot}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </Popup>
        </Map>

        <div className="pointer-events-none absolute left-5 top-5 rounded-full border border-white/8 bg-black/40 px-4 py-2 text-sm text-zinc-300 backdrop-blur-md">
          {locationStatus === "ready"
            ? "Live city map · Camera synced to your location"
            : "Live city map · Hover cards to pulse pins"}
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeRestaurant.restaurant.id}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="pointer-events-none absolute bottom-5 left-5 right-5 rounded-[28px] border border-white/10 bg-black/45 p-5 backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Now spotlighting</p>
                <h3 className="mt-2 font-display text-3xl text-white">{activeRestaurant.restaurant.name}</h3>
                <p className="mt-1 text-sm text-zinc-400">
                  {activeRestaurant.restaurant.cuisine} · {activeRestaurant.distanceLabel} · {activeRestaurant.restaurant.vibe}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {activeRestaurant.restaurant.reservationSlots.map((slot) => (
                  <span
                    key={slot}
                    className="rounded-full border border-white/8 bg-white/5 px-4 py-2 text-xs text-zinc-300"
                  >
                    {slot}
                  </span>
                ))}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
