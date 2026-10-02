import { useMemo } from "react";
import { create } from "zustand";
import { config } from "./config";
import { combine, defaultStart } from "./lib/time";
import type { Feature, Resource, ResourceKind } from "./types";

export type View = "book" | "planning" | "bookings";

export interface Selection {
  resource: Resource;
  start: Date;
  end: Date;
}

interface BookingState {
  kind: ResourceKind;
  day: string;
  time: string;
  /** Durée en minutes. */
  duration: number;
  people: number;
  features: Feature[];
  building: string | null;
  query: string;
  /** Ressource + créneau ouverts dans le panneau de réservation. */
  selection: Selection | null;

  setKind: (kind: ResourceKind) => void;
  setDay: (day: string) => void;
  setTime: (time: string) => void;
  setDuration: (minutes: number) => void;
  setPeople: (people: number) => void;
  toggleFeature: (feature: Feature) => void;
  setBuilding: (building: string | null) => void;
  setQuery: (query: string) => void;
  /** Positionne date + heure de début à partir d'une Date. */
  setStart: (start: Date) => void;
  open: (selection: Selection) => void;
  close: () => void;
}

const initial = defaultStart(new Date(), config.dayStartHour, config.dayEndHour);
const pad = (n: number) => String(n).padStart(2, "0");

export const useBooking = create<BookingState>((set) => ({
  kind: "room",
  day: initial.day,
  time: initial.time,
  duration: 60,
  people: 1,
  features: [],
  building: null,
  query: "",
  selection: null,

  setKind: (kind) =>
    set((s) => ({
      kind,
      features: [],
      building: null,
      query: "",
      duration: kind === "vehicle" ? Math.max(s.duration, 120) : s.duration > 240 ? 60 : s.duration,
    })),
  setDay: (day) => set({ day }),
  setTime: (time) => set({ time }),
  setDuration: (duration) => set({ duration }),
  setPeople: (people) => set({ people: Math.max(1, Math.min(99, people)) }),
  toggleFeature: (feature) =>
    set((s) => ({
      features: s.features.includes(feature) ? s.features.filter((f) => f !== feature) : [...s.features, feature],
    })),
  setBuilding: (building) => set({ building }),
  setQuery: (query) => set({ query }),
  setStart: (start) =>
    set({
      day: `${start.getFullYear()}-${pad(start.getMonth() + 1)}-${pad(start.getDate())}`,
      time: `${pad(start.getHours())}:${pad(start.getMinutes())}`,
    }),
  open: (selection) => set({ selection }),
  close: () => set({ selection: null }),
}));

/** Début / fin du créneau recherché. */
export function useSlot(): { start: Date; end: Date } {
  const day = useBooking((s) => s.day);
  const time = useBooking((s) => s.time);
  const duration = useBooking((s) => s.duration);
  return useMemo(() => {
    const start = combine(day, time);
    return { start, end: new Date(start.getTime() + duration * 60000) };
  }, [day, time, duration]);
}
