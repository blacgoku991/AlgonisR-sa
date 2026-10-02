import { addDays, addMinutes, startOfDay } from "date-fns";
import type {
  AvailabilityMap,
  Booking,
  BookingAttendee,
  BookingRequest,
  BookingService,
  BusySlot,
  CurrentUser,
  Person,
  Resource,
  ResourceKind,
  ResponseStatus,
} from "../types";
import { DEMO_GROUPS, DEMO_ME, DEMO_PEOPLE, DEMO_ROOMS, DEMO_VEHICLES, MEETING_SUBJECTS, TRIP_SUBJECTS } from "./demoData";
import { normalize } from "../lib/availability";

const STORAGE_KEY = "reza.demo.bookings.v1";

interface StoredBooking {
  id: string;
  subject: string;
  start: string;
  end: string;
  resourceId: string;
  attendees: { email: string; name: string }[];
  teams: boolean;
  message?: string;
}

// ── Générateur pseudo-aléatoire déterministe (mêmes données à chaque visite) ──

function seedFrom(text: string): number {
  let h = 1779033703 ^ text.length;
  for (let i = 0; i < text.length; i++) {
    h = Math.imul(h ^ text.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

function rng(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ALL_RESOURCES = [...DEMO_ROOMS, ...DEMO_VEHICLES];
const DIRECTORY = [...DEMO_PEOPLE, ...DEMO_GROUPS];

/** Créneaux occupés fictifs d'une journée pour une ressource ou une personne. */
function generatedDay(id: string, day: Date, kind: ResourceKind | "person"): BusySlot[] {
  const weekend = day.getDay() === 0 || day.getDay() === 6;
  const random = rng(seedFrom(`${id}|${day.toDateString()}`));
  const slots: BusySlot[] = [];

  if (kind === "person" && random() < 0.06 && !weekend) {
    return [{ start: addMinutes(day, 8 * 60), end: addMinutes(day, 19 * 60), status: "oof", subject: "Absent(e)" }];
  }

  const count = weekend ? (random() < 0.2 ? 1 : 0) : kind === "vehicle" ? Math.floor(random() * 3) : 2 + Math.floor(random() * 4);
  let cursor = 8 * 60 + Math.floor(random() * 4) * 30;
  for (let i = 0; i < count && cursor < 18 * 60; i++) {
    const length = kind === "vehicle" ? (2 + Math.floor(random() * 6)) * 60 : (1 + Math.floor(random() * 4)) * 30;
    const start = cursor;
    const end = Math.min(start + length, 19 * 60);
    const subjects = kind === "vehicle" ? TRIP_SUBJECTS : MEETING_SUBJECTS;
    const organizer = DEMO_PEOPLE[Math.floor(random() * DEMO_PEOPLE.length)];
    slots.push({
      start: addMinutes(day, start),
      end: addMinutes(day, end),
      status: kind === "person" && random() < 0.2 ? "tentative" : "busy",
      subject: kind === "person" ? undefined : `${subjects[Math.floor(random() * subjects.length)]} · ${organizer.name.split(" ")[0]}`,
    });
    cursor = end + (1 + Math.floor(random() * 5)) * 30;
  }
  return slots;
}

function readStore(): StoredBooking[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as StoredBooking[];
  } catch {
    /* stockage indisponible */
  }
  const seeded = seedBookings();
  writeStore(seeded);
  return seeded;
}

function writeStore(bookings: StoredBooking[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bookings));
  } catch {
    /* stockage indisponible : les réservations ne survivront pas au rechargement */
  }
}

function nextWeekday(from: Date, offset: number): Date {
  let d = addDays(startOfDay(from), offset);
  while (d.getDay() === 0 || d.getDay() === 6) d = addDays(d, 1);
  return d;
}

function seedBookings(): StoredBooking[] {
  const d1 = nextWeekday(new Date(), 1);
  const d2 = nextWeekday(new Date(), 3);
  const p = (i: number) => ({ email: DEMO_PEOPLE[i].email, name: DEMO_PEOPLE[i].name });
  return [
    {
      id: "demo-seed-1",
      subject: "Revue de sprint",
      start: addMinutes(d1, 10 * 60).toISOString(),
      end: addMinutes(d1, 11 * 60).toISOString(),
      resourceId: DEMO_ROOMS[1].id,
      attendees: [p(2), p(3), p(9)],
      teams: true,
    },
    {
      id: "demo-seed-2",
      subject: "Visite client — Lyon",
      start: addMinutes(d2, 8 * 60 + 30).toISOString(),
      end: addMinutes(d2, 17 * 60 + 30).toISOString(),
      resourceId: DEMO_VEHICLES[0].id,
      attendees: [p(0)],
      teams: false,
    },
  ];
}

function responseFor(id: string, email: string): ResponseStatus {
  const r = rng(seedFrom(id + email))();
  return r < 0.55 ? "accepted" : r < 0.7 ? "tentativelyAccepted" : "none";
}

function toBooking(stored: StoredBooking): Booking {
  const resource = ALL_RESOURCES.find((r) => r.id === stored.resourceId);
  const attendees: BookingAttendee[] = stored.attendees.map((a) => ({
    id: a.email,
    email: a.email,
    name: a.name,
    status: responseFor(stored.id, a.email),
  }));
  return {
    id: stored.id,
    subject: stored.subject,
    start: new Date(stored.start),
    end: new Date(stored.end),
    resource,
    resourceEmail: resource?.email,
    resourceName: resource?.name,
    resourceStatus: "accepted",
    attendees,
    organizer: DEMO_ME,
    isOrganizer: true,
    isCancelled: false,
    teamsJoinUrl: stored.teams ? "https://teams.microsoft.com/l/meetup-join/demo" : undefined,
    bodyPreview: stored.message,
  };
}

export class DemoBookingService implements BookingService {
  readonly mode = "demo" as const;

  async getCurrentUser(): Promise<CurrentUser> {
    return { id: DEMO_ME.id, name: DEMO_ME.name, givenName: DEMO_ME.givenName, email: DEMO_ME.email, jobTitle: DEMO_ME.jobTitle };
  }

  async getPhoto(): Promise<string | null> {
    return null;
  }

  async listResources(kind: ResourceKind): Promise<Resource[]> {
    await sleep(250);
    return kind === "room" ? DEMO_ROOMS : DEMO_VEHICLES;
  }

  async getAvailability(emails: string[], from: Date, to: Date): Promise<AvailabilityMap> {
    await sleep(300 + Math.random() * 300);
    const stored = readStore();
    const map: AvailabilityMap = {};
    for (const raw of emails) {
      const id = raw.toLowerCase();
      const resource = ALL_RESOURCES.find((r) => r.id === id);
      const kind: ResourceKind | "person" = resource?.kind ?? "person";
      const own: BusySlot[] = stored
        .filter((b) => b.resourceId === id || (kind === "person" && b.attendees.some((a) => a.email === id)))
        .map((b) => ({
          start: new Date(b.start),
          end: new Date(b.end),
          status: "busy" as const,
          subject: `${b.subject} · ${DEMO_ME.givenName}`,
        }));

      const busy: BusySlot[] = [...own];
      for (let day = startOfDay(from); day < to; day = addDays(day, 1)) {
        for (const slot of generatedDay(id, day, kind)) {
          if (!own.some((o) => o.start < slot.end && slot.start < o.end)) busy.push(slot);
        }
      }
      map[id] = { id, busy: busy.filter((s) => s.end > from && s.start < to) };
    }
    return map;
  }

  async suggestPeople(): Promise<Person[]> {
    return [3, 2, 9, 0, 1, 12, 5, 13, 8, 18].map((i) => DEMO_PEOPLE[i]).concat(DEMO_GROUPS[0]);
  }

  async searchPeople(query: string): Promise<Person[]> {
    await sleep(120);
    const q = normalize(query);
    if (!q) return [];
    return DIRECTORY.filter((p) => normalize(`${p.name} ${p.email} ${p.jobTitle ?? ""} ${p.department ?? ""}`).includes(q)).slice(0, 8);
  }

  async createBooking(request: BookingRequest): Promise<Booking> {
    await sleep(900);
    const availability = await this.getAvailability(
      [request.resource.email],
      startOfDay(request.start),
      addDays(startOfDay(request.end), 1),
    );
    const conflict = availability[request.resource.id]?.busy.some(
      (s) => s.status !== "free" && s.start < request.end && request.start < s.end,
    );
    if (conflict) throw new Error("Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez un autre horaire.");

    const stored: StoredBooking = {
      id: `demo-${Date.now().toString(36)}`,
      subject: request.subject,
      start: request.start.toISOString(),
      end: request.end.toISOString(),
      resourceId: request.resource.id,
      attendees: request.attendees.map((a) => ({ email: a.email, name: a.name })),
      teams: request.teamsMeeting,
      message: request.message,
    };
    writeStore([...readStore(), stored]);
    return toBooking(stored);
  }

  async listMyBookings(from: Date, to: Date): Promise<Booking[]> {
    await sleep(250);
    return readStore()
      .map(toBooking)
      .filter((b) => b.end > from && b.start < to)
      .sort((a, b) => a.start.getTime() - b.start.getTime());
  }

  async cancelBooking(booking: Booking): Promise<void> {
    await sleep(500);
    writeStore(readStore().filter((b) => b.id !== booking.id));
  }
}

/** Réinitialise les données de démonstration. */
export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
