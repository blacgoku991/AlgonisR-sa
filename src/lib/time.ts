import { addDays, addMinutes, differenceInCalendarDays, differenceInMinutes, format, isSameDay, startOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export const QUARTER = 15;

/** "2026-10-03" → Date locale à minuit. */
export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function dayKey(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

/** "15:30" → minutes depuis minuit. */
export function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + (m || 0);
}

export function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function combine(day: string, time: string): Date {
  return addMinutes(parseDayKey(day), timeToMinutes(time));
}

export function roundUpToQuarter(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const rest = d.getMinutes() % QUARTER;
  return rest === 0 ? d : addMinutes(d, QUARTER - rest);
}

/** Créneau par défaut : le prochain quart d'heure, ou demain 9 h si la journée est finie. */
export function defaultStart(now: Date, dayStartHour: number, dayEndHour: number): { day: string; time: string } {
  const next = roundUpToQuarter(now);
  const minutes = next.getHours() * 60 + next.getMinutes();
  if (isSameDay(next, now) && minutes <= (dayEndHour - 1) * 60) {
    const start = Math.max(minutes, dayStartHour * 60);
    return { day: dayKey(now), time: minutesToTime(start) };
  }
  return { day: dayKey(addDays(startOfDay(now), 1)), time: minutesToTime(Math.max(9, dayStartHour) * 60) };
}

export function timeOptions(startHour: number, endHour: number, step = QUARTER): string[] {
  const out: string[] = [];
  for (let m = startHour * 60; m <= endHour * 60; m += step) out.push(minutesToTime(m));
  return out;
}

export function overlaps(aStart: Date, aEnd: Date, bStart: Date, bEnd: Date): boolean {
  return aStart < bEnd && bStart < aEnd;
}

// ── Formatage (français) ─────────────────────────────────────

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function fmtTime(date: Date): string {
  return format(date, "HH:mm");
}

export function fmtRange(start: Date, end: Date): string {
  if (isSameDay(start, end)) return `${fmtTime(start)} – ${fmtTime(end)}`;
  return `${format(start, "d MMM HH:mm", { locale: fr })} → ${format(end, "d MMM HH:mm", { locale: fr })}`;
}

export function fmtDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const days = Math.floor(minutes / (24 * 60));
  if (days >= 1 && minutes % (24 * 60) === 0) return `${days} jour${days > 1 ? "s" : ""}`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
}

export function durationBetween(start: Date, end: Date): number {
  return differenceInMinutes(end, start);
}

/** "Aujourd'hui", "Demain", "Jeudi 9 octobre". */
export function fmtRelativeDay(date: Date, now = new Date()): string {
  const diff = differenceInCalendarDays(date, now);
  if (diff === 0) return "Aujourd'hui";
  if (diff === 1) return "Demain";
  if (diff === -1) return "Hier";
  const pattern = date.getFullYear() === now.getFullYear() ? "EEEE d MMMM" : "EEEE d MMMM yyyy";
  return cap(format(date, pattern, { locale: fr }));
}

export function fmtLongDate(date: Date): string {
  return cap(format(date, "EEEE d MMMM yyyy", { locale: fr }));
}

export function fmtShortDate(date: Date): string {
  return format(date, "EEE d MMM", { locale: fr });
}

export function fmtWeekday(date: Date): string {
  return format(date, "EEE", { locale: fr }).replace(".", "");
}

export function fmtMonthShort(date: Date): string {
  return format(date, "MMM", { locale: fr }).replace(".", "");
}

/** "dans 25 min", "dans 2 h", "en cours". */
export function fmtCountdown(start: Date, end: Date, now = new Date()): string | null {
  if (now >= start && now < end) return "En cours";
  const mins = differenceInMinutes(start, now);
  if (mins < 0) return null;
  if (mins < 1) return "Maintenant";
  if (mins < 60) return `Dans ${mins} min`;
  if (mins < 24 * 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m >= 10 ? `Dans ${h} h ${String(m).padStart(2, "0")}` : `Dans ${h} h`;
  }
  return null;
}

export { addDays, addMinutes, isSameDay, startOfDay, format };
export { fr as frLocale };
