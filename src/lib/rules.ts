import { addDays, addMinutes } from "date-fns";
import type { Booking, Person, Resource } from "../types";
import { fmtDuration, fmtTime } from "./time";

/** Règles de réservation (vérifiées avant tout appel à Microsoft 365). */
export const LIMITS = {
  maxDurationMin: { room: 10 * 60, vehicle: 14 * 24 * 60 },
  maxAdvanceDays: 180,
  pastToleranceMin: 5,
  maxAttendees: 250,
  maxSubjectLength: 255,
} as const;

/** Créneau déjà pris : levée par le service (avant ou après la réservation). */
export class BookingConflictError extends Error {
  constructor(message = "Ce créneau vient d'être réservé par quelqu'un d'autre. Choisissez un autre horaire.") {
    super(message);
    this.name = "BookingConflictError";
  }
}

interface Candidate {
  resource: Resource;
  start: Date;
  end: Date;
  attendees: Person[];
  subject?: string;
}

/** Renvoie la liste des problèmes bloquants (vide = réservation autorisée). */
export function validateBooking(c: Candidate, myBookings: Booking[] = [], now = new Date()): string[] {
  const errors: string[] = [];
  const minutes = Math.round((c.end.getTime() - c.start.getTime()) / 60000);

  if (minutes <= 0) errors.push("L'heure de fin doit suivre l'heure de début.");
  if (c.start < addMinutes(now, -LIMITS.pastToleranceMin)) errors.push("Ce créneau est déjà passé.");
  if (minutes > LIMITS.maxDurationMin[c.resource.kind]) {
    errors.push(`Durée maximale : ${fmtDuration(LIMITS.maxDurationMin[c.resource.kind])}.`);
  }
  if (c.start > addDays(now, LIMITS.maxAdvanceDays)) {
    errors.push(`Les réservations sont ouvertes ${LIMITS.maxAdvanceDays} jours à l'avance au maximum.`);
  }
  if (c.attendees.length > LIMITS.maxAttendees) errors.push(`${LIMITS.maxAttendees} invités au maximum.`);
  if ((c.subject ?? "").length > LIMITS.maxSubjectLength) errors.push("Objet trop long.");

  // Un collaborateur ne peut pas monopoliser deux véhicules en même temps.
  if (c.resource.kind === "vehicle") {
    const clash = myBookings.find(
      (b) => b.resource?.kind === "vehicle" && b.resource.id !== c.resource.id && b.start < c.end && c.start < b.end,
    );
    if (clash) {
      errors.push(`Vous avez déjà ${clash.resourceName} de ${fmtTime(clash.start)} à ${fmtTime(clash.end)} sur ce créneau.`);
    }
  }
  // Pas deux réservations de la même ressource qui se chevauchent pour la même personne.
  const self = myBookings.find((b) => b.resource?.id === c.resource.id && b.start < c.end && c.start < b.end);
  if (self) errors.push(`Vous avez déjà réservé ${c.resource.name} de ${fmtTime(self.start)} à ${fmtTime(self.end)}.`);

  return errors;
}

export type KeyStatus = "upcoming" | "toHand" | "out" | "overdue" | "returned" | "missed";

/** Statut des clés vu par l'accueil. */
export function keyStatus(b: { start: Date; end: Date; keyLog: { handedAt?: string; returnedAt?: string } }, now = new Date()): KeyStatus {
  if (b.keyLog.returnedAt) return "returned";
  if (b.keyLog.handedAt) return now > b.end ? "overdue" : "out";
  if (now > b.end) return "missed";
  // Les clés peuvent être remises jusqu'à 1 h avant le départ.
  return b.start.getTime() - now.getTime() <= 60 * 60000 ? "toHand" : "upcoming";
}
