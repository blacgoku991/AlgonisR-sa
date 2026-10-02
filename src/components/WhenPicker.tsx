import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, Clock, Hourglass } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "../config";
import { cn } from "../lib/cn";
import {
  addDays,
  combine,
  dayKey,
  fmtDuration,
  fmtMonthShort,
  fmtWeekday,
  format,
  frLocale,
  isSameDay,
  minutesToTime,
  parseDayKey,
  startOfDay,
  timeOptions,
  timeToMinutes,
} from "../lib/time";
import { useBooking } from "../store";
import type { ResourceKind } from "../types";
import { Popover, PopoverClose } from "./ui/Popover";

const ROOM_DURATIONS = [30, 60, 90, 120, 180];
const VEHICLE_DURATIONS = [60, 120, 240, 540];

export function WhenPicker({ kind }: { kind: ResourceKind }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
      <div className="min-w-0 flex-1">
        <Label icon={<CalendarDays />}>Jour</Label>
        <DateStrip />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <Label icon={<Clock />}>Début</Label>
          <TimePicker />
        </div>
        <div className="min-w-0">
          <Label icon={<Hourglass />}>Durée</Label>
          <DurationPicker kind={kind} />
        </div>
      </div>
    </div>
  );
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-zinc-500 uppercase dark:text-zinc-400 [&_svg]:size-3.5">
      {icon}
      {children}
    </div>
  );
}

// ── Bandeau de jours ─────────────────────────────────────────

function DateStrip() {
  const day = useBooking((s) => s.day);
  const setDay = useBooking((s) => s.setDay);
  const today = startOfDay(new Date());
  const selected = parseDayKey(day);
  const days = useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(today, i)), [today.getTime()]);
  const scroller = useRef<HTMLDivElement>(null);
  const outside = !days.some((d) => isSameDay(d, selected));

  useEffect(() => {
    const el = scroller.current?.querySelector<HTMLElement>("[data-selected=true]");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [day]);

  return (
    <div className="flex items-stretch gap-2">
      <div
        ref={scroller}
        className="scrollbar-none -mx-1 flex min-w-0 flex-1 snap-x gap-1.5 overflow-x-auto px-1 py-1 [mask-image:linear-gradient(to_right,black_calc(100%-40px),transparent)]"
      >
        {days.map((d, i) => {
          const active = isSameDay(d, selected);
          const weekend = d.getDay() === 0 || d.getDay() === 6;
          return (
            <button
              key={d.toISOString()}
              data-selected={active}
              onClick={() => setDay(dayKey(d))}
              aria-pressed={active}
              aria-label={format(d, "EEEE d MMMM", { locale: frLocale })}
              className={cn(
                "relative flex w-[54px] shrink-0 snap-start flex-col items-center rounded-lg py-2 transition-colors",
                active ? "text-white dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-900/5 dark:text-zinc-300 dark:hover:bg-white/5",
                weekend && !active && "opacity-60",
              )}
            >
              {active && (
                <motion.span
                  layoutId="day-pill"
                  className="bg-zinc-900 dark:bg-white absolute inset-0 rounded-lg"
                  transition={{ type: "spring", damping: 28, stiffness: 400 }}
                />
              )}
              <span className={cn("relative text-[11px] font-medium capitalize", active ? "opacity-70" : "text-zinc-400")}>
                {i === 0 ? "Auj." : i === 1 ? "Dem." : fmtWeekday(d)}
              </span>
              <span className="relative text-base leading-6 font-medium tabular-nums">{d.getDate()}</span>
              <span className={cn("relative text-[10px] capitalize", active ? "opacity-70" : "text-zinc-400")}>{fmtMonthShort(d)}</span>
            </button>
          );
        })}
      </div>
      <MonthCalendarButton highlighted={outside} />
    </div>
  );
}

function MonthCalendarButton({ highlighted }: { highlighted: boolean }) {
  const day = useBooking((s) => s.day);
  const setDay = useBooking((s) => s.setDay);
  const selected = parseDayKey(day);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(startOfMonth(selected));
  const today = startOfDay(new Date());

  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setMonth(startOfMonth(selected));
      }}
      align="end"
      trigger={
        <button
          className={cn(
            "flex w-[54px] shrink-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-[10px] font-medium transition-colors",
            highlighted
              ? "bg-zinc-900 dark:bg-white border-transparent text-white dark:text-zinc-900"
              : "border-zinc-300 text-zinc-500 hover:border-brand-400 hover:text-brand-600 dark:border-white/15 dark:text-zinc-400",
          )}
          aria-label="Choisir une autre date"
        >
          <CalendarDays className="size-5" />
          {highlighted ? format(selected, "d MMM", { locale: frLocale }) : "Autre"}
        </button>
      }
      className="w-[300px]"
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <button
          className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10"
          onClick={() => setMonth(addMonths(month, -1))}
          aria-label="Mois précédent"
        >
          <ChevronLeft className="size-4" />
        </button>
        <span className="text-sm font-semibold capitalize">{format(month, "MMMM yyyy", { locale: frLocale })}</span>
        <button
          className="rounded-md p-1.5 hover:bg-zinc-100 dark:hover:bg-white/10"
          onClick={() => setMonth(addMonths(month, 1))}
          aria-label="Mois suivant"
        >
          <ChevronRight className="size-4" />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="py-1 text-[11px] font-semibold text-zinc-400">
            {d}
          </span>
        ))}
        {cells.map((d) => {
          const past = d < today;
          const active = isSameDay(d, selected);
          const inMonth = d.getMonth() === month.getMonth();
          return (
            <PopoverClose asChild key={d.toISOString()}>
              <button
                disabled={past}
                onClick={() => setDay(dayKey(d))}
                className={cn(
                  "aspect-square rounded-md text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-30",
                  active
                    ? "bg-zinc-900 dark:bg-white font-semibold text-white dark:text-zinc-900"
                    : "hover:bg-zinc-100 dark:hover:bg-white/10",
                  !inMonth && !active && "text-zinc-400",
                  isSameDay(d, today) && !active && "font-bold text-brand-600 dark:text-brand-300",
                )}
              >
                {d.getDate()}
              </button>
            </PopoverClose>
          );
        })}
      </div>
    </Popover>
  );
}

// ── Heure de début ───────────────────────────────────────────

function TimePicker() {
  const day = useBooking((s) => s.day);
  const time = useBooking((s) => s.time);
  const setTime = useBooking((s) => s.setTime);
  const [open, setOpen] = useState(false);
  const options = timeOptions(config.dayStartHour, config.dayEndHour - 1, 15).concat(
    Array.from({ length: 3 }, (_, i) => minutesToTime((config.dayEndHour - 1) * 60 + 15 * (i + 1))),
  );
  const now = new Date();
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => {
      list.current?.querySelector<HTMLElement>("[data-selected=true]")?.scrollIntoView({ block: "center" });
    });
  }, [open]);

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      trigger={
        <button className="flex h-[66px] items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 shadow-sm transition-colors hover:border-brand-300 dark:border-white/10 dark:bg-white/5 dark:hover:border-brand-400/50">
          <span className="text-xl font-medium tabular-nums">{time}</span>
          <ChevronDown className={cn("size-4 text-zinc-400 transition-transform", open && "rotate-180")} />
        </button>
      }
      className="w-[292px] p-2"
    >
      <div ref={list} className="scrollbar-thin grid max-h-72 grid-cols-4 gap-1 overflow-y-auto p-1">
        {options.map((t) => {
          const past = combine(day, t) < new Date(now.getTime() - 5 * 60000);
          const active = t === time;
          const fullHour = t.endsWith(":00");
          return (
            <PopoverClose asChild key={t}>
              <button
                data-selected={active}
                disabled={past}
                onClick={() => setTime(t)}
                className={cn(
                  "rounded-md py-2 text-sm tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-25",
                  active
                    ? "bg-zinc-900 dark:bg-white font-semibold text-white dark:text-zinc-900"
                    : "hover:bg-zinc-100 dark:hover:bg-white/10",
                  fullHour && !active && "font-semibold",
                  !fullHour && !active && "text-zinc-500 dark:text-zinc-400",
                )}
              >
                {t}
              </button>
            </PopoverClose>
          );
        })}
      </div>
    </Popover>
  );
}

// ── Durée ────────────────────────────────────────────────────

function DurationPicker({ kind }: { kind: ResourceKind }) {
  const duration = useBooking((s) => s.duration);
  const setDuration = useBooking((s) => s.setDuration);
  const presets = kind === "room" ? ROOM_DURATIONS : VEHICLE_DURATIONS;
  const custom = !presets.includes(duration);
  const label = (m: number) =>
    kind === "vehicle" && m === 240 ? "½ journée" : kind === "vehicle" && m === 540 ? "Journée" : fmtDuration(m);

  return (
    <div className="flex h-[66px] items-center gap-1 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-sm dark:border-white/10 dark:bg-white/5">
      {presets.map((m) => (
        <button
          key={m}
          onClick={() => setDuration(m)}
          aria-pressed={duration === m}
          className={cn(
            "relative h-full rounded-md px-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors sm:px-3",
            duration === m ? "text-white dark:text-zinc-900" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10",
          )}
        >
          {duration === m && (
            <motion.span
              layoutId={`duration-${kind}`}
              className="bg-zinc-900 dark:bg-white absolute inset-0 rounded-md"
              transition={{ type: "spring", damping: 30, stiffness: 400 }}
            />
          )}
          <span className="relative">{label(m)}</span>
        </button>
      ))}
      <CustomEnd active={custom} kind={kind} />
    </div>
  );
}

function CustomEnd({ active, kind }: { active: boolean; kind: ResourceKind }) {
  const day = useBooking((s) => s.day);
  const time = useBooking((s) => s.time);
  const duration = useBooking((s) => s.duration);
  const setDuration = useBooking((s) => s.setDuration);
  const start = combine(day, time);
  const end = new Date(start.getTime() + duration * 60000);
  const [endDay, setEndDay] = useState(dayKey(end));
  const [endTime, setEndTime] = useState(format(end, "HH:mm"));
  const ends = timeOptions(0, 23, 15).concat("23:45");
  const candidate = combine(endDay, endTime);
  const minutes = Math.round((candidate.getTime() - start.getTime()) / 60000);
  const valid = minutes >= 15;

  return (
    <Popover
      onOpenChange={(o) => {
        if (o) {
          setEndDay(dayKey(end));
          setEndTime(format(end, "HH:mm"));
        }
      }}
      align="end"
      className="w-72"
      trigger={
        <button
          className={cn(
            "h-full rounded-md px-2.5 text-[13px] font-semibold whitespace-nowrap transition-colors sm:px-3",
            active
              ? "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900"
              : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/10",
          )}
        >
          {active ? fmtDuration(duration) : "Autre…"}
        </button>
      }
    >
      <p className="mb-3 px-1 text-sm font-semibold">Fin du créneau</p>
      <div className="flex gap-2">
        {kind === "vehicle" && (
          <input
            type="date"
            value={endDay}
            min={day}
            onChange={(e) => e.target.value && setEndDay(e.target.value)}
            className="h-11 min-w-0 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm dark:border-white/10 dark:bg-white/5 dark:[color-scheme:dark]"
          />
        )}
        <select
          value={endTime}
          onChange={(e) => setEndTime(e.target.value)}
          className="h-11 flex-1 rounded-md border border-zinc-200 bg-white px-3 text-sm tabular-nums dark:border-white/10 dark:bg-white/5 dark:[color-scheme:dark]"
        >
          {ends.map((t) => (
            <option key={t} value={t} disabled={kind === "room" && timeToMinutes(t) <= timeToMinutes(time)}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 px-1">
        <span className={cn("text-xs", valid ? "text-zinc-500" : "text-rose-600")}>
          {valid ? `Durée : ${fmtDuration(minutes)}` : "La fin doit suivre le début"}
        </span>
        <PopoverClose asChild>
          <button
            disabled={!valid}
            onClick={() => setDuration(minutes)}
            className="bg-zinc-900 dark:bg-white rounded-md px-4 py-2 text-sm font-semibold text-white dark:text-zinc-900 disabled:opacity-40"
          >
            Valider
          </button>
        </PopoverClose>
      </div>
    </Popover>
  );
}
