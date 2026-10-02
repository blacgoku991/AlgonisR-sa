import { describe, expect, it } from "vitest";
import type { BusySlot, Resource } from "../types";
import {
  conflictsWith,
  findNextFree,
  matchesFilters,
  personState,
  rankResources,
  resourceState,
  type Filters,
  type ResourceState,
} from "./availability";

const at = (h: number, m = 0) => new Date(2030, 0, 7, h, m);
const slot = (h1: number, m1: number, h2: number, m2: number, status: BusySlot["status"] = "busy"): BusySlot => ({
  start: at(h1, m1),
  end: at(h2, m2),
  status,
});

const room = (over: Partial<Resource>): Resource => ({
  id: "r@x.com",
  email: "r@x.com",
  kind: "room",
  name: "Salle",
  features: [],
  ...over,
});

describe("conflictsWith", () => {
  const busy = [slot(9, 0, 10, 0), slot(14, 0, 15, 0, "free"), slot(16, 0, 17, 0, "workingElsewhere")];

  it("détecte un chevauchement", () => {
    expect(conflictsWith(busy, at(9, 30), at(10, 30))).toHaveLength(1);
  });

  it("accepte un créneau qui commence à la fin d'une réunion", () => {
    expect(conflictsWith(busy, at(10), at(11))).toHaveLength(0);
  });

  it("ignore les statuts non bloquants", () => {
    expect(conflictsWith(busy, at(14), at(17))).toHaveLength(0);
  });
});

describe("findNextFree", () => {
  it("propose le premier créneau libre de la bonne durée", () => {
    const busy = [slot(9, 0, 10, 0), slot(10, 30, 12, 0)];
    // 30 min libres entre 10:00 et 10:30 : insuffisant pour 1 h → 12:00
    expect(findNextFree(busy, at(9), 60, at(20))).toEqual(at(12));
    expect(findNextFree(busy, at(9), 30, at(20))).toEqual(at(10));
  });

  it("arrondit au quart d'heure suivant", () => {
    expect(findNextFree([slot(9, 0, 10, 10)], at(9), 30, at(20))).toEqual(at(10, 15));
  });

  it("renvoie null si la journée est complète", () => {
    expect(findNextFree([slot(8, 0, 20, 0)], at(9), 30, at(20))).toBeNull();
  });
});

describe("resourceState", () => {
  it("libre avec heure de fin de disponibilité", () => {
    const state = resourceState({ id: "a", busy: [slot(15, 0, 16, 0)] }, at(13), at(14), at(20));
    expect(state).toEqual({ status: "free", freeUntil: at(15) });
  });

  it("indisponible si la boîte aux lettres est en erreur", () => {
    expect(resourceState({ id: "a", busy: [], error: "introuvable" }, at(13), at(14), at(20)).status).toBe("unknown");
  });

  it("en chargement si aucune donnée", () => {
    expect(resourceState(undefined, at(13), at(14), at(20)).status).toBe("loading");
  });
});

describe("personState", () => {
  it("priorise absent > occupé > provisoire", () => {
    const busy = [slot(9, 0, 10, 0, "tentative"), slot(9, 30, 11, 0, "busy")];
    expect(personState({ id: "p", busy }, at(9), at(10))).toBe("busy");
    expect(personState({ id: "p", busy: [slot(9, 0, 10, 0, "tentative")] }, at(9), at(10))).toBe("tentative");
    expect(personState({ id: "p", busy: [slot(8, 0, 18, 0, "oof")] }, at(9), at(10))).toBe("oof");
    expect(personState({ id: "p", busy: [] }, at(9), at(10))).toBe("free");
    expect(personState(undefined, at(9), at(10))).toBe("unknown");
  });
});

describe("matchesFilters", () => {
  const r = room({ name: "Salle Écrins", capacity: 6, features: ["screen", "video"], building: "Siège" });
  const base: Filters = { people: 1, features: [], building: null, query: "" };

  it("filtre par capacité, équipements, bâtiment et texte (sans accents)", () => {
    expect(matchesFilters(r, { ...base, people: 6 })).toBe(true);
    expect(matchesFilters(r, { ...base, people: 7 })).toBe(false);
    expect(matchesFilters(r, { ...base, features: ["video"] })).toBe(true);
    expect(matchesFilters(r, { ...base, features: ["whiteboard"] })).toBe(false);
    expect(matchesFilters(r, { ...base, building: "Annexe" })).toBe(false);
    expect(matchesFilters(r, { ...base, query: "ecrins" })).toBe(true);
  });
});

describe("rankResources", () => {
  it("classe les disponibles d'abord puis la capacité la plus ajustée", () => {
    const free: ResourceState = { status: "free", freeUntil: null };
    const busy: ResourceState = { status: "busy", conflicts: [], nextFree: null };
    const items = [
      { resource: room({ id: "big", name: "Grande", capacity: 20 }), state: free },
      { resource: room({ id: "busy", name: "Occupée", capacity: 6 }), state: busy },
      { resource: room({ id: "fit", name: "Ajustée", capacity: 6 }), state: free },
    ];
    expect(rankResources(items, 5).map((i) => i.resource.id)).toEqual(["fit", "big", "busy"]);
  });
});
