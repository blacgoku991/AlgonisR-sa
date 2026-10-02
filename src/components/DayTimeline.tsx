import { addMinutes } from "date-fns";
import { config } from "../config";
import { isBlocking } from "../lib/availability";
import { cn } from "../lib/cn";
import { fmtTime } from "../lib/time";
import type { BusySlot } from "../types";

interface DayTimelineProps {
  day: Date;
  busy: BusySlot[] | undefined;
  selection?: { start: Date; end: Date; ok: boolean };
  className?: string;
}

/** Frise de la journée : créneaux occupés, créneau demandé et heure actuelle. */
export function DayTimeline({ day, busy, selection, className }: DayTimelineProps) {
  const from = addMinutes(day, config.dayStartHour * 60);
  const to = addMinutes(day, config.dayEndHour * 60);
  const span = to.getTime() - from.getTime();
  const pct = (d: Date) => Math.min(100, Math.max(0, ((d.getTime() - from.getTime()) / span) * 100));
  const now = new Date();
  const showNow = now > from && now < to;
  const labelEvery = config.dayEndHour - config.dayStartHour > 10 ? 4 : 2;
  const labels: number[] = [];
  for (let h = config.dayStartHour; h <= config.dayEndHour; h += labelEvery) labels.push(h);
  if (config.dayEndHour - labels[labels.length - 1] >= labelEvery / 2) labels.push(config.dayEndHour);

  return (
    <div className={cn("select-none", className)}>
      <div className="relative h-3 overflow-hidden rounded-full bg-emerald-500/15 dark:bg-emerald-400/10">
        {showNow && <div className="hatched absolute inset-y-0 left-0" style={{ width: `${pct(now)}%` }} />}
        {busy?.filter(isBlocking).map((slot, i) => (
          <div
            key={i}
            title={`${fmtTime(slot.start)} – ${fmtTime(slot.end)}${slot.subject ? ` · ${slot.subject}` : ""}`}
            className={cn(
              "absolute inset-y-0 rounded-[3px]",
              slot.status === "tentative" ? "bg-amber-400/70" : "bg-zinc-400/70 dark:bg-zinc-500/80",
              slot.optimistic && "bg-brand-500",
            )}
            style={{ left: `${pct(slot.start)}%`, width: `${Math.max(0.8, pct(slot.end) - pct(slot.start))}%` }}
          />
        ))}
        {selection && (
          <div
            className={cn(
              "absolute -inset-y-0 rounded-[4px] ring-2 ring-inset",
              selection.ok ? "bg-brand-500/35 ring-brand-500" : "bg-rose-500/30 ring-rose-500",
            )}
            style={{ left: `${pct(selection.start)}%`, width: `${Math.max(1.2, pct(selection.end) - pct(selection.start))}%` }}
          />
        )}
        {showNow && <div className="absolute inset-y-0 w-0.5 bg-rose-500" style={{ left: `${pct(now)}%` }} />}
      </div>
      <div className="relative mt-1 h-3 text-[10px] font-medium text-zinc-400 tabular-nums dark:text-zinc-500">
        {labels.map((h) => (
          <span
            key={h}
            className={cn("absolute", h === config.dayStartHour ? "" : h === config.dayEndHour ? "-translate-x-full" : "-translate-x-1/2")}
            style={{ left: `${((h - config.dayStartHour) / (config.dayEndHour - config.dayStartHour)) * 100}%` }}
          >
            {h}h
          </span>
        ))}
      </div>
    </div>
  );
}
