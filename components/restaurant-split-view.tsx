"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Coffee,
  Leaf,
  LocateFixed,
  MapPinned,
  Moon,
  Sparkles,
  Star,
  Trees,
  UtensilsCrossed,
} from "lucide-react";

import { BookingModal } from "@/components/booking-modal";
import type { UserLocation } from "@/lib/geo";
import { calculateDistanceKm, formatDistanceLabel, PUNE_CENTER } from "@/lib/geo";
import type { GeolocationStatus } from "@/hooks/use-geolocation";
import type { Restaurant, RestaurantIcon } from "@/lib/restaurants";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/map-store";

// ─── Icon map ─────────────────────────────────────────────────────────────────

const iconMap: Record<RestaurantIcon, typeof Leaf> = {
  leaf: Leaf,
  coffee: Coffee,
  sparkles: Sparkles,
};

// ─── Animation variants ───────────────────────────────────────────────────────

const containerVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.07 },
  },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

// ─── Filter definitions ───────────────────────────────────────────────────────

type FilterId = "all" | "fine-dining" | "pure-veg" | "cafe" | "nightlife" | "outdoor";

const FILTERS: { id: FilterId; label: string; Icon: typeof Leaf }[] = [
  { id: "all",         label: "All",          Icon: UtensilsCrossed },
  { id: "fine-dining", label: "Fine Dining",  Icon: Star            },
  { id: "pure-veg",    label: "Pure Veg",     Icon: Leaf            },
  { id: "cafe",        label: "Cafe",         Icon: Coffee          },
  { id: "nightlife",   label: "Nightlife",    Icon: Moon            },
  { id: "outdoor",     label: "Outdoor",      Icon: Trees           },
];

function matchesFilter(restaurant: Restaurant, filter: FilterId): boolean {
  if (filter === "all") return true;
  const t = [...restaurant.tags, ...restaurant.dietary_tags].map((s) => s.toLowerCase());
  const id = restaurant.id;
  switch (filter) {
    case "fine-dining": return id === "mainland-china" || id === "toit-brewery" || t.includes("chef-led") || t.includes("date night");
    case "pure-veg":    return t.includes("pure veg") || t.includes("vegan-friendly");
    case "cafe":        return id === "cafe-good-luck" || id === "11-east-street" || id === "barometer" || t.includes("brunch") || t.includes("breakfast");
    case "nightlife":   return t.includes("late seating") || t.includes("late night") || id === "toit-brewery";
    case "outdoor":     return t.includes("outdoor seating") || id === "11-east-street" || id === "toit-brewery";
    default:            return true;
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type RestaurantWithDistance = {
  restaurant: Restaurant;
  distanceKm: number;
  distanceLabel: string;
};

type RestaurantSplitViewProps = {
  restaurants: Restaurant[];
  userLocation: UserLocation | null;
  locationStatus: GeolocationStatus;
  locationError: string | null;
  onRequestLocation: () => void;
};

// ─── Root component ───────────────────────────────────────────────────────────

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
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const restaurantsWithDistance = useMemo<RestaurantWithDistance[]>(() => {
    const reference = userLocation ?? PUNE_CENTER;
    const estimated = !userLocation;

    const mapped = restaurants.map((restaurant) => {
      const distanceKm = calculateDistanceKm(reference, {
        latitude: restaurant.coordinates[1],
        longitude: restaurant.coordinates[0],
      });
      return {
        restaurant,
        distanceKm,
        distanceLabel: formatDistanceLabel(distanceKm, estimated),
      };
    });

    return mapped.sort((a, b) => a.distanceKm - b.distanceKm);
  }, [restaurants, userLocation]);

  const filteredRestaurants = useMemo(
    () => restaurantsWithDistance.filter(({ restaurant }) => matchesFilter(restaurant, activeFilter)),
    [restaurantsWithDistance, activeFilter],
  );

  const activeRestaurant = useMemo(() => {
    const list = filteredRestaurants.length ? filteredRestaurants : restaurantsWithDistance;
    if (selectionMode === "auto") return list[0];
    return list.find(({ restaurant }) => restaurant.id === activeRestaurantId) ?? list[0];
  }, [activeRestaurantId, filteredRestaurants, restaurantsWithDistance, selectionMode]);

  const bookingRestaurant = useMemo(
    () => restaurants.find((r) => r.id === bookingRestaurantId) ?? null,
    [bookingRestaurantId, restaurants],
  );

  const selectRestaurant = (restaurantId: string, mode: "auto" | "manual" = "manual") => {
    setSelectionMode(mode);
    setActiveRestaurantId(restaurantId);
  };

  return (
    <>
      {/* ── Filter bar ─────────────────────────────────────────────────────── */}
      <div className="mb-5 -mx-1 overflow-x-auto px-1 pb-1">
        <div className="flex items-center gap-2 w-max">
          {FILTERS.map(({ id, label, Icon }) => {
            const isActive = id === activeFilter;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setActiveFilter(id);
                  setSelectionMode("auto");
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-medium transition-all active:scale-95 whitespace-nowrap",
                  isActive
                    ? "bg-orange-50 text-orange-600 border border-orange-300 shadow-sm"
                    : "border border-gray-200 text-slate-500 bg-white hover:border-orange-200 hover:text-slate-700",
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Split layout ───────────────────────────────────────────────────── */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.92fr)_minmax(0,1.38fr)]">
        {/* Card panel */}
        <div className="glass-panel rounded-4xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 border-b border-gray-200 px-1 pb-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Interactive feed</p>
                <h2 className="mt-0.5 font-display text-2xl tracking-wide text-slate-900">Curated List</h2>
              </div>
              <div className="hidden items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-500 sm:flex">
                <MapPinned className="h-4 w-4 text-[#FF6B35]" />
                Hover a card to move the pin.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRequestLocation}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-700 hover:border-orange-200 hover:bg-orange-50 active:scale-95"
              >
                <LocateFixed className="h-4 w-4 text-[#FF6B35]" />
                {locationStatus === "ready" ? "Location synced" : "Use my location"}
              </button>
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-slate-500">
                {locationStatus === "ready"
                  ? "Sorted by proximity."
                  : locationStatus === "requesting"
                    ? "Requesting location…"
                    : locationError ?? "Grant access to sort by distance."}
              </div>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeFilter}
              className="mt-4 grid max-h-[calc(100vh-20rem)] gap-4 overflow-y-auto pr-1 xl:grid-cols-2"
              variants={containerVariants}
              initial="hidden"
              animate="show"
            >
              {(filteredRestaurants.length ? filteredRestaurants : restaurantsWithDistance).map((entry) => (
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
          </AnimatePresence>
        </div>

        {/* Map panel */}
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
          restaurantsWithDistance.find(({ restaurant }) => restaurant.id === bookingRestaurant?.id)?.distanceLabel
        }
        isOpen={Boolean(bookingRestaurant)}
        onClose={() => setBookingRestaurantId(null)}
      />
    </>
  );
}

// ─── Restaurant Card with food image carousel ─────────────────────────────────

type RestaurantCardProps = {
  restaurant: Restaurant;
  distanceLabel: string;
  isActive: boolean;
  onHover: () => void;
  onBookNow: () => void;
};

function RestaurantCard({ restaurant, distanceLabel, isActive, onHover, onBookNow }: RestaurantCardProps) {
  const Icon = iconMap[restaurant.icon];
  const [currentImg, setCurrentImg] = useState(0);
  const images = restaurant.food_images?.length ? restaurant.food_images : [restaurant.image];

  const prev = () => setCurrentImg((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrentImg((i) => (i + 1) % images.length);

  return (
    <motion.article
      variants={cardVariants}
      onHoverStart={onHover}
      onFocusCapture={onHover}
      className={cn(
        "group relative overflow-hidden rounded-3xl border bg-white transition-all duration-400 ease-out",
        "shadow-[0_8px_30px_rgb(0,0,0,0.04)]",
        "hover:shadow-[0_16px_48px_rgb(0,0,0,0.08)]",
        restaurant.layout === "wide" && "xl:col-span-2",
        isActive
          ? "border-orange-300"
          : "border-gray-200 hover:border-orange-200",
      )}
      whileHover={{ y: -5, scale: 1.005 }}
      transition={{ type: "spring", stiffness: 300, damping: 28 }}
    >
      {/* ── Food image carousel ─────────────────────────────────────────── */}
      <div className="relative h-52 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentImg}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={images[currentImg]}
              alt={`${restaurant.name} dish ${currentImg + 1}`}
              fill
              className="object-cover"
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 32vw, 90vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Distance badge */}
        <div className="absolute left-3 top-3 z-10 rounded-full border border-white/60 bg-white/80 px-3 py-1 text-[10px] font-medium text-slate-900 backdrop-blur-sm">
          {distanceLabel}
        </div>

        {/* Carousel controls — only visible on hover */}
        {images.length > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-2 top-1/2 z-10 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            <div className="absolute bottom-2 left-0 right-0 z-10 flex justify-center gap-1">
              {images.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setCurrentImg(i); }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    i === currentImg ? "w-4 bg-white" : "w-1.5 bg-white/50",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Card body ───────────────────────────────────────────────────── */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.22em] text-slate-400">
              <Icon className="h-3 w-3 text-[#FF6B35] shrink-0" />
              {restaurant.cuisine}
            </div>
            <h3 className="font-display text-xl leading-tight text-slate-900 truncate">{restaurant.name}</h3>
            <p className="text-[11px] text-slate-500">{restaurant.neighborhood}</p>
          </div>
          <div className="shrink-0 text-right">
            <div className="flex items-center justify-end gap-1">
              <Star className="h-3.5 w-3.5 fill-orange-500 text-orange-500" />
              <span className="text-sm font-semibold text-slate-900">{restaurant.rating.toFixed(1)}</span>
            </div>
            <p className="mt-0.5 text-[11px] text-slate-500">{restaurant.price}</p>
          </div>
        </div>

        {/* Dietary tags */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {restaurant.dietary_tags.slice(0, 2).map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-0.5 text-[10px] text-slate-500"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* CTA */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {restaurant.reservationSlots.slice(0, 2).map((slot) => (
              <span
                key={slot}
                className="rounded-full border border-gray-200 bg-gray-50 px-2.5 py-1 text-[10px] text-slate-500"
              >
                {slot}
              </span>
            ))}
          </div>
          <motion.button
            type="button"
            onClick={onBookNow}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[#FF6B35] px-4 py-2 text-xs font-semibold text-white shadow-[0_4px_16px_rgba(255,107,53,0.28)] hover:shadow-[0_8px_24px_rgba(255,107,53,0.36)] active:scale-95"
            animate={{ width: isActive ? 100 : 82 }}
            transition={{ type: "spring", stiffness: 280, damping: 22 }}
          >
            Reserve
            <ArrowUpRight className="h-3.5 w-3.5" />
          </motion.button>
        </div>
      </div>
    </motion.article>
  );
}

// ─── TomTom Map panel ─────────────────────────────────────────────────────────

type MapPanelProps = {
  activeRestaurant: RestaurantWithDistance | undefined;
  locationStatus: GeolocationStatus;
  onRequestLocation: () => void;
  restaurants: RestaurantWithDistance[];
  selectionMode: "auto" | "manual";
  setActiveRestaurantId: (id: string, mode?: "auto" | "manual") => void;
  userLocation: UserLocation | null;
};

/** Marker metadata stored per restaurant */
type MarkerEntry = {
  marker: unknown;
  element: HTMLDivElement;
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
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

  const token = process.env.NEXT_PUBLIC_TOMTOM_API_KEY;

  // Listen to Baymax "View on Map" triggers via the shared store
  const mapTarget = useMapStore((s) => s.mapTarget);
  const flySequence = useMapStore((s) => s.flySequence);
  const clearMapTarget = useMapStore((s) => s.clearMapTarget);

  // ── Initialize TomTom map (runs once when token is present) ─────────
  useEffect(() => {
    if (!token || !mapContainerRef.current || mapInstanceRef.current) return;

    let cancelled = false;
    const markers = markersRef.current;

    // Dynamic import avoids SSR / "window is not defined" errors
    import("@tomtom-international/web-sdk-maps").then((tt) => {
      if (cancelled || !mapContainerRef.current) return;

      const center: [number, number] = activeRestaurant
        ? activeRestaurant.restaurant.coordinates
        : [PUNE_CENTER.longitude, PUNE_CENTER.latitude];

      const map = tt.map({
        key: token,
        container: mapContainerRef.current,
        center,
        zoom: 12.8,
        style: `https://api.tomtom.com/style/2/custom/style/dG9tdG9tQEBAd2lpSkI0Q0t3bzFOM2FUdDs7amFsdXRibEhTdVlmMktzeWc=.json?key=${token}`,
        language: "en-GB",
      });

      mapInstanceRef.current = map;

      map.on("load", () => {
        if (cancelled) return;

        // Restaurant markers
        restaurants.forEach(({ restaurant, distanceLabel }) => {
          const isActive = restaurant.id === activeRestaurant?.restaurant.id;
          const el = buildMarkerDom(restaurant, distanceLabel, isActive);

          el.addEventListener("mouseenter", () => setActiveRestaurantId(restaurant.id));
          el.addEventListener("click", () => setActiveRestaurantId(restaurant.id));

          const marker = new tt.Marker({ element: el, anchor: "bottom" })
            .setLngLat(restaurant.coordinates)
            .addTo(map);

          markers.set(restaurant.id, { marker, element: el });
        });

        // User dot
        if (userLocation) {
          const dot = document.createElement("div");
          dot.className = "tomtom-user-marker";
          dot.innerHTML = `<span class="tomtom-user-pulse"></span><span class="tomtom-user-dot"></span>`;
          new tt.Marker({ element: dot, anchor: "center" })
            .setLngLat([userLocation.longitude, userLocation.latitude])
            .addTo(map);
        }
      });
    });

    return () => {
      cancelled = true;
      const currentMap = mapInstanceRef.current;
      if (currentMap) {
        currentMap.remove();
        mapInstanceRef.current = null;
        markers.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ── Pan to hovered / selected restaurant ────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !activeRestaurant) return;

    map.panTo(activeRestaurant.restaurant.coordinates, {
      duration: 800,
    });

    // Zoom slightly closer on manual selection
    if (selectionMode === "manual") {
      map.zoomTo(14.2, { duration: 800 });
    }

    // Highlight active marker, un-highlight the rest
    markersRef.current.forEach(({ element }, id) => {
      applyMarkerHighlight(element, id === activeRestaurant.restaurant.id);
    });
  }, [activeRestaurant, selectionMode]);

  // ── Fly to Baymax "View on Map" target ──────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapTarget) return;

    map.flyTo({
      center: [mapTarget.longitude, mapTarget.latitude],
      zoom: 15,
      duration: 1200,
    });

    clearMapTarget();
  }, [mapTarget, flySequence, clearMapTarget]);

  // ── No-token fallback ───────────────────────────────────────────────
  if (!token || !activeRestaurant) {
    return (
      <div className="glass-panel sticky top-24 flex min-h-[40rem] flex-col overflow-hidden rounded-4xl p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">Map preview</p>
            <h3 className="mt-1 font-display text-3xl text-slate-900">Connect TomTom to go live</h3>
          </div>
          <div className="rounded-full border border-orange-200 bg-orange-50 px-4 py-2 text-xs uppercase tracking-[0.2em] text-orange-500">
            Add NEXT_PUBLIC_TOMTOM_API_KEY
          </div>
        </div>

        <div className="relative mt-6 flex-1 overflow-hidden rounded-3xl border border-gray-200 bg-[radial-gradient(circle_at_top,rgba(255,107,53,0.06),transparent_28%),#F1F5F9]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.04)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.04)_1px,transparent_1px)] bg-[size:72px_72px]" />
          {restaurants.map(({ restaurant, distanceLabel }, index) => {
            const left = 18 + ((index * 13) % 60);
            const top  = 18 + ((index * 17) % 58);
            const Icon = iconMap[restaurant.icon];
            const isAct = restaurant.id === activeRestaurant?.restaurant?.id;

            return (
              <motion.button
                key={restaurant.id}
                className={cn(
                  "absolute rounded-full border px-3 py-2 text-left backdrop-blur-md shadow-[0_4px_16px_rgb(0,0,0,0.06)]",
                  isAct
                    ? "border-[#FF6B35] bg-[#FF6B35] text-white"
                    : "border-gray-200 bg-white text-slate-900",
                )}
                style={{ left: `${left}%`, top: `${top}%` }}
                onMouseEnter={() => setActiveRestaurantId(restaurant.id)}
                whileHover={{ y: -4, scale: 1.04 }}
                animate={isAct ? { y: [0, -8, 0], scale: [1, 1.08, 1] } : { y: 0, scale: 1 }}
                transition={{ repeat: isAct ? Number.POSITIVE_INFINITY : 0, duration: 1.6 }}
              >
                <div className="flex items-center gap-2 text-xs font-semibold">
                  <Icon className="h-3.5 w-3.5" />
                  {distanceLabel}
                </div>
              </motion.button>
            );
          })}

          <div className="absolute bottom-6 left-6 right-6 rounded-3xl border border-gray-200 bg-white/90 p-5 shadow-md backdrop-blur-xl">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Ready when you are</p>
            <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
              <div>
                <h4 className="font-display text-2xl text-slate-900">{activeRestaurant!.restaurant.name}</h4>
                <p className="mt-1 text-sm text-slate-500">
                  {activeRestaurant!.restaurant.neighborhood} · {activeRestaurant!.restaurant.cuisine}
                </p>
              </div>
              {locationStatus === "ready" ? (
                <div className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-500">
                  <LocateFixed className="h-4 w-4 text-[#FF6B35]" />
                  Live distance sync active.
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-700 hover:border-orange-200 active:scale-95"
                >
                  <CalendarDays className="h-4 w-4 text-[#FF6B35]" />
                  Enable proximity sorting.
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Live TomTom map ─────────────────────────────────────────────────
  return (
    <div className="glass-panel sticky top-24 min-h-[40rem] overflow-hidden rounded-4xl p-2">
      <div className="relative h-[calc(100vh-8rem)] min-h-[38rem] overflow-hidden rounded-3xl border border-gray-200">
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Floating label */}
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-xs text-slate-500 shadow-sm backdrop-blur-md">
          {locationStatus === "ready"
            ? "Live map · Synced to your location"
            : "Live map · Hover cards to move pins"}
        </div>

        {/* Spotlighting card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeRestaurant.restaurant.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-md backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Now spotlighting</p>
                <h3 className="mt-1 font-display text-2xl text-slate-900">{activeRestaurant.restaurant.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {activeRestaurant.restaurant.cuisine} · {activeRestaurant.distanceLabel} · {activeRestaurant.restaurant.vibe}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {activeRestaurant.restaurant.reservationSlots.map((slot) => (
                  <span
                    key={slot}
                    className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1.5 text-[10px] text-slate-500"
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

// ─── Marker DOM helpers ───────────────────────────────────────────────────────

function buildMarkerDom(restaurant: Restaurant, distanceLabel: string, isActive: boolean): HTMLDivElement {
  const wrapper = document.createElement("div");
  wrapper.className = "tomtom-custom-marker";
  wrapper.dataset.restaurantId = restaurant.id;

  const pill = document.createElement("div");
  pill.className = `tomtom-marker-pill${isActive ? " tomtom-marker-active" : ""}`;

  const nameSpan = document.createElement("span");
  nameSpan.className = "tomtom-marker-name";
  nameSpan.textContent = restaurant.name;

  const distSpan = document.createElement("span");
  distSpan.className = "tomtom-marker-distance";
  distSpan.textContent = distanceLabel;

  pill.appendChild(nameSpan);
  pill.appendChild(distSpan);

  const tail = document.createElement("div");
  tail.className = "tomtom-marker-tail";

  wrapper.appendChild(pill);
  wrapper.appendChild(tail);

  return wrapper;
}

function applyMarkerHighlight(element: HTMLDivElement, isActive: boolean): void {
  const pill = element.querySelector(".tomtom-marker-pill");
  if (!pill) return;

  if (isActive) {
    pill.classList.add("tomtom-marker-active");
    element.style.transition = "transform 0.3s cubic-bezier(.34,1.56,.64,1)";
    element.style.transform = "translateY(-8px)";
    setTimeout(() => { element.style.transform = "translateY(0)"; }, 350);
  } else {
    pill.classList.remove("tomtom-marker-active");
    element.style.transform = "translateY(0)";
  }
}
