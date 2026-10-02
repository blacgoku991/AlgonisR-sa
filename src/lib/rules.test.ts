import { describe, expect, it } from "vitest";
import type { Booking, Resource } from "../types";
import { keyStatus, validateBooking } from "./rules";

const now = new Date(2030, 0, 7, 9, 0);
const at = (d: number, h: number, m = 0) => new Date(2030, 0, d, h, m);
const room: Resource = { id: "r", email: "r@x.com", kind: "room", name: "Everest", features: [] };
const car = (id: string): Resource => ({ id, email: `${id}@x.com`, kind: "vehicle", name: id, features: [] });
const mine = (resource: Resource, start: Date, end: Date): Booking => ({
  id: resource.id + start.getTime(),
  subject: "x",
  start,
  end,
  resource,
  resourceName: resource.name,
  resourceStatus: "accepted",
  attendees: [],
  isOrganizer: true,
  isCancelled: false,
});

describe("validateBooking", () => {
  const base = { resource: room, start: at(7, 10), end: at(7, 11), attendees: [] };

  it("accepte une réservation normale", () => {
    expect(validateBooking(base, [], now)).toEqual([]);
  });

  it("refuse le passé, une fin avant le début, une durée excessive et trop loin dans le futur", () => {
    expect(validateBooking({ ...base, start: at(7, 8), end: at(7, 8, 30) }, [], now)[0]).toMatch(/passé/);
    expect(validateBooking({ ...base, end: at(7, 9) }, [], now)[0]).toMatch(/fin/);
    expect(validateBooking({ ...base, end: at(7, 21) }, [], now)[0]).toMatch(/Durée maximale/);
    expect(validateBooking({ ...base, start: new Date(2031, 0, 7, 10), end: new Date(2031, 0, 7, 11) }, [], now)[0]).toMatch(
      /jours à l'avance/,
    );
  });

  it("interdit deux véhicules en même temps pour la même personne", () => {
    const errors = validateBooking({ ...base, resource: car("clio") }, [mine(car("megane"), at(7, 10, 30), at(7, 12))], now);
    expect(errors[0]).toMatch(/déjà megane/);
  });

  it("interdit de réserver deux fois la même ressource sur des créneaux qui se chevauchent", () => {
    expect(validateBooking(base, [mine(room, at(7, 10, 30), at(7, 11, 30))], now)[0]).toMatch(/déjà réservé Everest/);
    expect(validateBooking(base, [mine(room, at(7, 11), at(7, 12))], now)).toEqual([]);
  });
});

describe("keyStatus", () => {
  const b = (handedAt?: string, returnedAt?: string) => ({ start: at(7, 10), end: at(7, 12), keyLog: { handedAt, returnedAt } });

  it("suit le cycle de vie des clés", () => {
    expect(keyStatus(b(), at(7, 8))).toBe("upcoming");
    expect(keyStatus(b(), at(7, 9, 30))).toBe("toHand");
    expect(keyStatus(b("x"), at(7, 11))).toBe("out");
    expect(keyStatus(b("x"), at(7, 13))).toBe("overdue");
    expect(keyStatus(b("x", "y"), at(7, 13))).toBe("returned");
    expect(keyStatus(b(), at(7, 13))).toBe("missed");
  });
});
