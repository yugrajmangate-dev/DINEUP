"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { UserLocation } from "@/lib/geo";

export type GeolocationStatus =
  | "idle"
  | "requesting"
  | "ready"
  | "denied"
  | "error"
  | "unsupported";

export type UseGeolocationResult = {
  isSupported: boolean;
  location: UserLocation | null;
  status: GeolocationStatus;
  error: string | null;
  requestLocation: () => void;
};

type UseGeolocationOptions = {
  autoStart?: boolean;
  enableHighAccuracy?: boolean;
};

export function useGeolocation({
  autoStart = true,
  enableHighAccuracy = true,
}: UseGeolocationOptions = {}): UseGeolocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [status, setStatus] = useState<GeolocationStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  const clearWatch = useCallback(() => {
    if (watchIdRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setLocation(null);
      setStatus("unsupported");
      setError("Geolocation is not supported in this browser.");
      return;
    }

    clearWatch();
    setStatus((current) => (current === "ready" ? "ready" : "requesting"));
    setError(null);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        });
        setStatus("ready");
        setError(null);
      },
      (positionError) => {
        setLocation(null);
        switch (positionError.code) {
          case positionError.PERMISSION_DENIED:
            setStatus("denied");
            setError("Location access was denied. Enable it to sort by proximity.");
            break;
          case positionError.TIMEOUT:
            setStatus("error");
            setError("Location lookup timed out. Try again in a moment.");
            break;
          default:
            setStatus("error");
            setError("Unable to retrieve your location right now.");
            break;
        }
      },
      {
        enableHighAccuracy,
        maximumAge: 15_000,
        timeout: 12_000,
      },
    );
  }, [clearWatch, enableHighAccuracy]);

  useEffect(() => {
    if (autoStart) {
      requestLocation();
    }

    return () => {
      clearWatch();
    };
  }, [autoStart, clearWatch, requestLocation]);

  return {
    isSupported: typeof navigator !== "undefined" && "geolocation" in navigator,
    location,
    status,
    error,
    requestLocation,
  };
}
