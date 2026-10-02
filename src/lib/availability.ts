import { addMinutes } from "date-fns";
import type { Availability, BusySlot, Feature, Resource } from "../types";
import { QUARTER, roundUpToQuarter } from "./time";

const BLOCKING = new Set(["busy", "tentative", "oof"]);

export function isBlocking(slot: BusySlot): boolean {
  return BLOCKING.has(slot.status);
}

export function conflictsWith(busy: BusySlot[], start: Date, end: Date): BusySlot[] {
  return busy.filter((s) => isBlocking(s) && s.start < end && start < s.end);
}

/** Premier créneau libre de `durationMin` minutes à partir de `from`, sans dépasser `limit`. */
export function findNextFree(busy: BusySlot[], from: Date, durationMin: number, limit: Date): Date | null {
  const blocking = busy.filter(isBlocking).sort((a, b) => a.start.getTime() - b.start.getTime());
  const candidates = [from, ...blocking.filter((s) => s.end > from).map((s) => roundUpToQuarter(s.end))];
  candidates.sort((a, b) => a.getTime() - b.getTime());
  for (const candidate of candidates) {
    const end = addMinutes(candidate, durationMin);
    if (end > limit) return null;
    if (conflictsWith(blocking, candidate, end).length === 0) return candidate;
  }
  return null;
}

/** Heure jusqu'à laquelle la ressource reste libre après `from` (null = toute la plage). */
export function freeUntil(busy: BusySlot[], from: Date, limit: Date): Date | null {
  const next = busy
    .filter((s) => isBlocking(s) && s.start >= from && s.start < limit)
    .sort((a, b) => a.start.getTime() - b.start.getTime())[0];
  return next ? next.start : null;
}

export type ResourceState =
  | { status: "free"; freeUntil: Date | null }
  | { status: "busy"; conflicts: BusySlot[]; nextFree: Date | null }
  | { status: "unknown"; error?: string }
  | { status: "loading" };

export function resourceState(availability: Availability | undefined, start: Date, end: Date, searchLimit: Date): ResourceState {
  if (!availability) return { status: "loading" };
  if (availability.error) return { status: "unknown", error: availability.error };
  const conflicts = conflictsWith(availability.busy, start, end);
  if (conflicts.length === 0) return { status: "free", freeUntil: freeUntil(availability.busy, end, searchLimit) };
  const durationMin = Math.round((end.getTime() - start.getTime()) / 60000);
  const from = new Date(Math.max(start.getTime(), roundUpToQuarter(new Date()).getTime()));
  return { status: "busy", conflicts, nextFree: findNextFree(availability.busy, from, durationMin, searchLimit) };
}

export type PersonStatus = "free" | "busy" | "tentative" | "oof" | "unknown";

export function personState(availability: Availability | undefined, start: Date, end: Date): PersonStatus {
  if (!availability || availability.error) return "unknown";
  const overlapping = availability.busy.filter((s) => s.start < end && start < s.end);
  if (overlapping.some((s) => s.status === "oof")) return "oof";
  if (overlapping.some((s) => s.status === "busy")) return "busy";
  if (overlapping.some((s) => s.status === "tentative")) return "tentative";
  return "free";
}

export interface Filters {
  people: number;
  features: Feature[];
  building: string | null;
  query: string;
}

export function matchesFilters(resource: Resource, filters: Filters): boolean {
  if (filters.people > 1 && resource.capacity !== undefined && resource.capacity < filters.people) return false;
  if (filters.features.some((f) => !resource.features.includes(f))) return false;
  if (filters.building && resource.building !== filters.building) return false;
  const q = normalize(filters.query);
  if (q) {
    const haystack = normalize(
      [resource.name, resource.building, resource.floor, resource.model, resource.plate, resource.description].filter(Boolean).join(" "),
    );
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function normalize(value: string): string {
  return value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
}

const STATE_ORDER: Record<ResourceState["status"], number> = { free: 0, loading: 1, busy: 2, unknown: 3 };

/** Disponibles d'abord, puis capacité la plus ajustée au besoin, puis ordre alphabétique. */
export function rankResources<T extends { resource: Resource; state: ResourceState }>(items: T[], people: number): T[] {
  return [...items].sort((a, b) => {
    const s = STATE_ORDER[a.state.status] - STATE_ORDER[b.state.status];
    if (s !== 0) return s;
    if (a.state.status === "busy" && b.state.status === "busy") {
      const an = a.state.nextFree?.getTime() ?? Infinity;
      const bn = b.state.nextFree?.getTime() ?? Infinity;
      if (an !== bn) return an - bn;
    }
    const fit = (r: Resource) => (r.capacity === undefined ? 999 : Math.abs(r.capacity - Math.max(people, 1)));
    const f = fit(a.resource) - fit(b.resource);
    if (f !== 0) return f;
    return a.resource.name.localeCompare(b.resource.name, "fr");
  });
}

export { QUARTER };
