export type UserLocation = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

/** FC Road / Deccan Gymkhana area — used as the reference when the user
 *  hasn't granted location permission yet. */
export const PUNE_CENTER: UserLocation = {
  latitude: 18.5204,
  longitude: 73.8567,
  accuracy: 0,
};

const EARTH_RADIUS_KM = 6371;

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

/**
 * Haversine great-circle distance between two geographic points.
 *
 * IMPORTANT – coordinate-order contract:
 *   • `from` and `to` always use **named** `{ latitude, longitude }` fields.
 *   • Restaurant `coordinates` are stored as `[longitude, latitude]` (GeoJSON /
 *     TomTom order). At the call-site the caller MUST unpack them as:
 *       calculateDistanceKm(ref, { latitude: coords[1], longitude: coords[0] })
 *
 * For Pune:  latitude  ≈ 18.5 (north),  longitude ≈ 73.8 (east)
 */
export function calculateDistanceKm(
  from: UserLocation | null | undefined,
  to: { latitude: number; longitude: number } | null | undefined,
): number {
  const safeFrom = from ?? PUNE_CENTER;
  const safeTo = to ?? PUNE_CENTER;

  // Defensive guard: return 0 for obviously invalid coordinates
  if (
    !isFinite(safeFrom.latitude) || !isFinite(safeFrom.longitude) ||
    !isFinite(safeTo.latitude)   || !isFinite(safeTo.longitude)
  ) {
    console.warn("[geo] calculateDistanceKm received non-finite coordinates", { from: safeFrom, to: safeTo });
    return 0;
  }

  const latitudeDelta  = toRadians(safeTo.latitude  - safeFrom.latitude);
  const longitudeDelta = toRadians(safeTo.longitude - safeFrom.longitude);
  const fromLatitude   = toRadians(safeFrom.latitude);
  const toLatitude     = toRadians(safeTo.latitude);

  const haversine =
    Math.sin(latitudeDelta  / 2) ** 2 +
    Math.cos(fromLatitude) *
      Math.cos(toLatitude) *
      Math.sin(longitudeDelta / 2) ** 2;

  const angularDistance =
    2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));

  return EARTH_RADIUS_KM * angularDistance;
}

export function formatDistanceLabel(distanceKm: number, estimated = false) {
  if (!isFinite(distanceKm) || distanceKm < 0) return "distance unknown";
  const prefix = estimated ? "~" : "";
  if (distanceKm < 1) {
    return `${prefix}${Math.max(50, Math.round(distanceKm * 1000 / 50) * 50)} m away`;
  }
  return `${prefix}${distanceKm.toFixed(1)} km away`;
}
