"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import dynamic from "next/dynamic";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Compass,
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

import type { UserLocation } from "@/lib/geo";
import { calculateDistanceKm, formatDistanceLabel } from "@/lib/geo";
import type { GeolocationStatus } from "@/hooks/use-geolocation";
import type { Restaurant, RestaurantIcon } from "@/lib/restaurants";
import { cn } from "@/lib/utils";
import { useMapStore } from "@/store/map-store";

const BookingModal = dynamic(() => import("@/components/booking-modal").then(mod => mod.BookingModal), { ssr: false });

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

// ─── Root component ───────────────────────────────────────────────────────────

export function RestaurantSplitView({
  restaurants,
  userLocation,
  locationStatus,
  locationError,
  onRequestLocation,
}: RestaurantSplitViewProps) {
  const hasLiveLocation = locationStatus === "ready" && !!userLocation;
  const [activeRestaurantId, setActiveRestaurantId] = useState(restaurants[0]?.id);
  const [bookingRestaurantId, setBookingRestaurantId] = useState<string | null>(null);
  const [selectionMode, setSelectionMode] = useState<"auto" | "manual">("auto");
  const [activeFilter, setActiveFilter] = useState<FilterId>("all");

  const restaurantsWithDistance = useMemo<RestaurantWithDistance[]>(() => {
    const mapped = restaurants.map((restaurant) => {
      const distanceKm = hasLiveLocation && userLocation
        ? calculateDistanceKm(userLocation, {
            latitude: restaurant.coordinates[1],
            longitude: restaurant.coordinates[0],
          })
        : null;

      return {
        restaurant,
        distanceKm,
        distanceLabel: distanceKm === null
          ? "Enable location to see distance"
          : formatDistanceLabel(distanceKm),
      };
    });

    if (!hasLiveLocation) {
      return mapped;
    }

    return mapped.sort((a, b) => (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY));
  }, [hasLiveLocation, restaurants, userLocation]);

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
                Click a card to focus it on the map.
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onRequestLocation}
                className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-slate-700 hover:border-orange-200 hover:bg-orange-50 active:scale-95"
              >
                <LocateFixed className="h-4 w-4 text-[#FF6B35]" />
                {locationStatus === "ready" ? "Location synced" : locationStatus === "requesting" ? "Requesting location…" : "Use my location"}
              </button>
              <div className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-slate-500">
                {hasLiveLocation
                  ? `Showing live distances from your location${userLocation?.accuracy ? ` · ±${Math.round(userLocation.accuracy)} m` : ""}.`
                  : locationStatus === "requesting"
                    ? "Requesting location…"
                    : locationError ?? "Allow location access to see distance from you."}
              </div>
              <div className="rounded-full border border-orange-100 bg-orange-50 px-4 py-2 text-sm text-orange-700">
                {hasLiveLocation ? "Your location is live on the map." : "Distances stay hidden until you share your location."}
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
              {(filteredRestaurants.length ? filteredRestaurants : restaurantsWithDistance).map((entry, idx) => (
                <RestaurantCard
                  key={entry.restaurant.id}
                  restaurant={entry.restaurant}
                  distanceLabel={entry.distanceLabel}
                  isActive={entry.restaurant.id === activeRestaurant?.restaurant.id}
                  onSelect={() => {
                    selectRestaurant(entry.restaurant.id);
                    setBookingRestaurantId(entry.restaurant.id);
                  }}
                  onBookNow={() => setBookingRestaurantId(entry.restaurant.id)}
                  isPriority={idx < 4}
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
  onSelect: () => void;
  onBookNow: () => void;
  isPriority?: boolean;
};

function RestaurantCard({ restaurant, distanceLabel, isActive, onSelect, onBookNow, isPriority }: RestaurantCardProps) {
  const Icon = iconMap[restaurant.icon];
  const [currentImg, setCurrentImg] = useState(0);
  const [imgError, setImgError] = useState(false);
  const images = restaurant.food_images?.length ? restaurant.food_images : [restaurant.image];
  const currentSrc = imgError
    ? restaurant.image   // fall back to hero image on carousel image failure
    : images[currentImg];

  const prev = () => setCurrentImg((i) => (i - 1 + images.length) % images.length);
  const next = () => setCurrentImg((i) => (i + 1) % images.length);

  return (
    <motion.article
      variants={cardVariants}
      onClick={onSelect}
      onFocusCapture={onSelect}
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
              src={currentSrc}
              alt={`${restaurant.name} dish ${currentImg + 1}`}
              fill
              priority={isPriority}
              className="object-cover"
              sizes="(min-width: 1280px) 22vw, (min-width: 1024px) 32vw, 90vw"
              onError={() => setImgError(true)}
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
              title="Previous image"
              aria-label="Previous image"
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-2 top-1/2 z-10 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full bg-white/80 text-slate-900 shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Next image"
              aria-label="Next image"
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
                  title={`Show image ${i + 1}`}
                  aria-label={`Show image ${i + 1}`}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marker: any;
  element: HTMLDivElement;
};

type UserMarkerLike = {
  remove: () => void;
  setLngLat: (coords: [number, number]) => UserMarkerLike;
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
  const currentRestaurant = activeRestaurant ?? restaurants[0];
  const hasLiveLocation = locationStatus === "ready" && !!userLocation;
  const mapContainerRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const ttRef = useRef<any>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());
  const mapLoadedRef = useRef(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const userMarkerRef = useRef<UserMarkerLike | null>(null);
  const hasCenteredToUserRef = useRef(false);

  const token = process.env.NEXT_PUBLIC_TOMTOM_API_KEY ?? "XrGZxbn0mSMFA47GFG6KuiD8bV7VtbMi";

  // Listen to Baymax "View on Map" triggers via the shared store
  const mapTarget = useMapStore((s) => s.mapTarget);
  const flySequence = useMapStore((s) => s.flySequence);
  const clearMapTarget = useMapStore((s) => s.clearMapTarget);

  const resizeMap = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    requestAnimationFrame(() => {
      try {
        map.resize();
      } catch (err) {
        console.error("[TomTom] resize() failed:", err);
      }
    });
  };

  // ── Initialize TomTom map (runs once when token is present) ─────────
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current || !currentRestaurant) return;

    let cancelled = false;
    let resizeObserver: ResizeObserver | null = null;
    const markers = markersRef.current;

    // Dynamic import avoids SSR / "window is not defined" errors
    import("@tomtom-international/web-sdk-maps").then((tt) => {
      if (cancelled || !mapContainerRef.current) return;

      ttRef.current = tt;

      const center: [number, number] = currentRestaurant.restaurant.coordinates;

      // Wrap map init in try/catch — TomTom SDK throws plain objects
      // (not Error instances) on WebGL / key failures, which React's
      // error boundary surfaces as "[object Object]"
      let map: ReturnType<typeof tt.map>;
      try {
        map = tt.map({
          key: token,
          container: mapContainerRef.current,
          center,
          zoom: 12.8,
          language: "en-GB",
        });
      } catch (err) {
        console.error("[TomTom] map() init failed:", err);
        return;
      }

      mapInstanceRef.current = map;

      map.on("error", (e: unknown) => {
        console.error("[TomTom] map error event:", e);
      });

      map.on("load", () => {
        if (cancelled) return;
        mapLoadedRef.current = true;
        setIsMapReady(true);
        resizeMap();

        // Some layouts settle a tick later after sticky/grid sizing resolves.
        window.setTimeout(resizeMap, 60);
        window.setTimeout(resizeMap, 220);

        syncRestaurantMarkers({
          tt,
          map,
          entries: restaurants,
          activeRestaurantId: currentRestaurant.restaurant.id,
          markers,
          setActiveRestaurantId,
        });

        syncUserMarker({
          tt,
          map,
          hasLiveLocation,
          userLocation,
          userMarkerRef,
        });
      });

      resizeObserver = new ResizeObserver(() => {
        resizeMap();
      });

      resizeObserver.observe(mapContainerRef.current);
      window.addEventListener("resize", resizeMap);
    }).catch((err) => {
      console.error("[TomTom] SDK import or map setup failed:", err);
    });

    return () => {
      cancelled = true;
      mapLoadedRef.current = false;
      setIsMapReady(false);
      resizeObserver?.disconnect();
      window.removeEventListener("resize", resizeMap);
      const currentMap = mapInstanceRef.current;
      if (currentMap) {
        userMarkerRef.current?.remove?.();
        userMarkerRef.current = null;
        currentMap.remove();
        mapInstanceRef.current = null;
        markers.clear();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRestaurant, restaurants, setActiveRestaurantId, token]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const tt = ttRef.current;
    if (!map || !tt || !mapLoadedRef.current || !currentRestaurant) return;

    syncRestaurantMarkers({
      tt,
      map,
      entries: restaurants,
      activeRestaurantId: currentRestaurant.restaurant.id,
      markers: markersRef.current,
      setActiveRestaurantId,
    });
  }, [currentRestaurant, restaurants, setActiveRestaurantId]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    const tt = ttRef.current;
    if (!map || !tt || !mapLoadedRef.current) return;

    syncUserMarker({
      tt,
      map,
      hasLiveLocation,
      userLocation,
      userMarkerRef,
    });
  }, [hasLiveLocation, userLocation]);

  useEffect(() => {
    if (hasLiveLocation) return;
    hasCenteredToUserRef.current = false;
  }, [hasLiveLocation]);

  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoadedRef.current || !isMapReady || !hasLiveLocation || !userLocation) return;
    if (hasCenteredToUserRef.current) return;

    hasCenteredToUserRef.current = true;
    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 14.8,
      duration: 1200,
    });
  }, [hasLiveLocation, isMapReady, userLocation]);

  const centerOnUserLocation = () => {
    const map = mapInstanceRef.current;
    if (!map || !mapLoadedRef.current) return;

    if (!hasLiveLocation || !userLocation) {
      onRequestLocation();
      return;
    }

    map.flyTo({
      center: [userLocation.longitude, userLocation.latitude],
      zoom: 15.2,
      duration: 900,
    });
  };

  // ── Pan to hovered / selected restaurant ────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !currentRestaurant || !mapLoadedRef.current) return;

    map.easeTo({
      center: currentRestaurant.restaurant.coordinates,
      zoom: selectionMode === "manual" ? 14.2 : map.getZoom(),
      duration: 800,
    });

    // Highlight active marker, un-highlight the rest
    markersRef.current.forEach(({ element }, id) => {
      applyMarkerHighlight(element, id === currentRestaurant.restaurant.id);
    });
  }, [currentRestaurant, selectionMode]);

  // ── Fly to Baymax "View on Map" target ──────────────────────────────
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!mapTarget) return;

    if (mapTarget.restaurantId) {
      setActiveRestaurantId(mapTarget.restaurantId, "manual");
    }

    if (!map || !mapLoadedRef.current || !isMapReady) return;

    map.flyTo({
      center: [mapTarget.longitude, mapTarget.latitude],
      zoom: 15,
      duration: 1200,
    });

    clearMapTarget();
  }, [mapTarget, flySequence, clearMapTarget, isMapReady, setActiveRestaurantId]);

  if (!currentRestaurant) {
    return (
      <div className="glass-panel sticky top-24 flex min-h-150 items-center justify-center rounded-4xl p-6 text-center text-slate-500">
        No restaurants available right now.
      </div>
    );
  }

  // ── Live TomTom map ─────────────────────────────────────────────────
  return (
    <div className="glass-panel sticky top-24 min-h-160 overflow-hidden rounded-4xl p-2">
      {/* TomTom requires the container to have a non-zero computed height before
          map() is called. h-[calc(100vh-8rem)] provides that; min-h-[600px]
          is the hard floor so the canvas is never zero-height on short viewports. */}
      <div className="relative h-[calc(100vh-8rem)] min-h-150 overflow-hidden rounded-3xl border border-gray-200">
        <div ref={mapContainerRef} className="absolute inset-0" />

        {/* Floating label */}
        <div className="pointer-events-none absolute left-4 top-4 rounded-full border border-gray-200 bg-white/90 px-4 py-2 text-xs text-slate-500 shadow-sm backdrop-blur-md">
          {hasLiveLocation
            ? `Live map · Your location is active${userLocation?.accuracy ? ` · ±${Math.round(userLocation.accuracy)} m` : ""}`
            : locationStatus === "requesting"
              ? "Live map · Waiting for your location permission"
              : "Live map · Allow location access to see your true distances"}
        </div>

        <button
          type="button"
          onClick={centerOnUserLocation}
          className="absolute left-4 top-16 z-10 inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white/95 px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm backdrop-blur-md transition-all hover:border-orange-200 hover:text-orange-600 active:scale-95"
        >
          <LocateFixed className="h-3.5 w-3.5 text-[#FF6B35]" />
          {hasLiveLocation ? "Center on my location" : "Enable my location"}
        </button>

        {!hasLiveLocation && (
          <div className="absolute right-4 top-4 z-10 max-w-xs rounded-2xl border border-orange-200 bg-white/95 p-4 text-sm text-slate-600 shadow-lg backdrop-blur-md">
            <div className="flex items-start gap-3">
              <div className="rounded-2xl bg-orange-50 p-2 text-orange-600">
                <Compass className="h-4 w-4" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">Use your location for accurate distances</p>
                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  DineUp will only show hotel distances from your actual position after you allow location access.
                </p>
                <button
                  type="button"
                  onClick={onRequestLocation}
                  className="pointer-events-auto mt-3 inline-flex items-center gap-2 rounded-full bg-[#FF6B35] px-3.5 py-2 text-xs font-semibold text-white shadow-[0_8px_20px_rgba(255,107,53,0.25)] active:scale-95"
                >
                  <LocateFixed className="h-3.5 w-3.5" />
                  Share my location
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spotlighting card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentRestaurant.restaurant.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="pointer-events-none absolute bottom-4 left-4 right-4 rounded-3xl border border-gray-200 bg-white/90 p-4 shadow-md backdrop-blur-xl"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">Now spotlighting</p>
                <h3 className="mt-1 font-display text-2xl text-slate-900">{currentRestaurant.restaurant.name}</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  {currentRestaurant.restaurant.cuisine} · {currentRestaurant.distanceLabel} · {hasLiveLocation ? "From your live location" : "Waiting for your location"} · {currentRestaurant.restaurant.vibe}
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentRestaurant.restaurant.reservationSlots.map((slot) => (
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

function syncRestaurantMarkers({
  tt,
  map,
  entries,
  activeRestaurantId,
  markers,
  setActiveRestaurantId,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any;
  entries: RestaurantWithDistance[];
  activeRestaurantId: string;
  markers: Map<string, MarkerEntry>;
  setActiveRestaurantId: (id: string, mode?: "auto" | "manual") => void;
}) {
  const nextIds = new Set(entries.map(({ restaurant }) => restaurant.id));

  markers.forEach((entry, id) => {
    if (nextIds.has(id)) return;
    entry.marker.remove();
    markers.delete(id);
  });

  entries.forEach(({ restaurant, distanceLabel }) => {
    const existing = markers.get(restaurant.id);

    if (!existing) {
      const el = buildMarkerDom(restaurant, distanceLabel, restaurant.id === activeRestaurantId);
      el.addEventListener("click", () => setActiveRestaurantId(restaurant.id));

      const marker = new tt.Marker({ element: el, anchor: "bottom" })
        .setLngLat(restaurant.coordinates)
        .addTo(map);

      markers.set(restaurant.id, { marker, element: el });
      return;
    }

    const distanceNode = existing.element.querySelector(".tomtom-marker-distance");
    if (distanceNode) {
      distanceNode.textContent = distanceLabel;
    }

    applyMarkerHighlight(existing.element, restaurant.id === activeRestaurantId);
  });
}

function syncUserMarker({
  tt,
  map,
  hasLiveLocation,
  userLocation,
  userMarkerRef,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tt: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  map: any;
  hasLiveLocation: boolean;
  userLocation: UserLocation | null;
  userMarkerRef: React.MutableRefObject<UserMarkerLike | null>;
}) {
  if (!hasLiveLocation || !userLocation) {
    userMarkerRef.current?.remove?.();
    userMarkerRef.current = null;
    return;
  }

  if (!userMarkerRef.current) {
    const dot = document.createElement("div");
    dot.className = "tomtom-user-marker";
    dot.innerHTML = `<span class="tomtom-user-pulse"></span><span class="tomtom-user-dot"></span>`;
    userMarkerRef.current = new tt.Marker({ element: dot, anchor: "center" })
      .setLngLat([userLocation.longitude, userLocation.latitude])
      .addTo(map);
    return;
  }

  userMarkerRef.current.setLngLat([userLocation.longitude, userLocation.latitude]);
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
