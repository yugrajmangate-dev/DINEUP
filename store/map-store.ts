import { create } from "zustand";

type MapTarget = {
  longitude: number;
  latitude: number;
  restaurantId?: string;
};

type MapState = {
  /** ID of the restaurant Baymax is currently highlighting */
  activeRestaurantId: string | null;
  /** Coordinates to fly to — set by Baymax "View on Map" */
  mapTarget: MapTarget | null;
  /** Monotonic counter so identical coords still trigger a fly */
  flySequence: number;
  /** Actions */
  setActiveRestaurantId: (id: string | null) => void;
  setMapTarget: (target: MapTarget) => void;
  clearMapTarget: () => void;
};

export const useMapStore = create<MapState>((set) => ({
  activeRestaurantId: null,
  mapTarget: null,
  flySequence: 0,
  setActiveRestaurantId: (id) => set({ activeRestaurantId: id }),
  setMapTarget: (target) =>
    set((state) => ({
      mapTarget: target,
      flySequence: state.flySequence + 1,
    })),
  clearMapTarget: () => set({ mapTarget: null }),
}));
