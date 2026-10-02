import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { Check, ChevronLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { config } from "../config";
import { cn } from "../lib/cn";
import { FEATURES, FILTERABLE } from "../lib/features";
import {
  addDays,
  combine,
  dayKey,
  fmtDuration,
  fmtMonthShort,
  fmtTime,
  fmtWeekday,
  format,
  frLocale,
  isSameDay,
  parseDayKey,
  startOfDay,
  timeOptions,
} from "../lib/time";
import { useBooking } from "../store";
import { KindToggle } from "./KindToggle";
import type { Resource, ResourceKind } from "../types";

const DURATIONS: Record<ResourceKind, number[]> = {
  room: [15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 600],
  vehicle: [60, 120, 180, 240, 360, 480, 1440, 2880, 4320, 7200, 10080],
};

function durationLabel(kind: ResourceKind, m: number) {
  if (kind === "vehicle" && m === 240) return "Demi-journée (4 h)";
  if (kind === "vehicle" && m === 480) return "Journée (8 h)";
  if (m === 10080) return "1 semaine";
  if (m >= 1440 && m % 1440 === 0) return `${m / 1440} jour${m > 1440 ? "s" : ""}`;
  return fmtDuration(m);
}

/** Panneau de critères : type, date, horaire, capacité, équipements, site. */
export function SearchPanel({ resources }: { resources: Resource[] | undefined }) {
  const kind = useBooking((s) => s.kind);
  const setKind = useBooking((s) => s.setKind);
  const day = useBooking((s) => s.day);
  const time = useBooking((s) => s.time);
  const setTime = useBooking((s) => s.setTime);
  const duration = useBooking((s) => s.duration);
  const setDuration = useBooking((s) => s.setDuration);
  const people = useBooking((s) => s.people);
  const setPeople = useBooking((s) => s.setPeople);
  const features = useBooking((s) => s.features);
  const toggleFeature = useBooking((s) => s.toggleFeature);
  const building = useBooking((s) => s.building);
  const setBuilding = useBooking((s) => s.setBuilding);

  const start = combine(day, time);
  const end = new Date(start.getTime() + duration * 60000);
  const durations = DURATIONS[kind].includes(duration) ? DURATIONS[kind] : [...DURATIONS[kind], duration].sort((a, b) => a - b);
  const now = new Date();
  const base = timeOptions(config.dayStartHour, config.dayEndHour, 15).slice(0, -1);
  const times = base.includes(time) ? base : [...base, time].sort();
  const buildings = [...new Set((resources ?? []).map((r) => r.building).filter((b): b is string => Boolean(b)))].sort();
  const available = FILTERABLE[kind].filter((f) => (resources ?? []).some((r) => r.features.includes(f)));
  const filtered = people > 1 || features.length > 0 || building !== null;
  const [more, setMore] = useState(false);
  const activeCount = (people > 1 ? 1 : 0) + features.length + (building ? 1 : 0);

  return (
    <div className="card divide-y divide-zinc-200 dark:divide-white/[0.06]">
      <Section>
        <KindToggle value={kind} onChange={setKind} />
      </Section>

      <Section title="Date">
        <div className="hidden lg:block">
          <MiniCalendar />
        </div>
        <div className="lg:hidden">
          <DateStrip />
        </div>
      </Section>

      <Section title="Horaire">
        <div className="grid grid-cols-2 gap-2">
          <Select label="Début" value={time} onChange={setTime}>
            {times.map((t) => (
              <option key={t} value={t} disabled={combine(day, t) < new Date(now.getTime() - 5 * 60000)}>
                {t}
              </option>
            ))}
          </Select>
          <Select label="Durée" value={String(duration)} onChange={(v) => setDuration(Number(v))}>
            {durations.map((m) => (
              <option key={m} value={m}>
                {durationLabel(kind, m)}
              </option>
            ))}
          </Select>
        </div>
        <p className="mt-2 text-xs text-zinc-500 tabular-nums">
          {fmtTime(start)} → {isSameDay(start, end) ? fmtTime(end) : `${format(end, "EEE d MMM", { locale: frLocale })} ${fmtTime(end)}`}
        </p>
      </Section>

      <button
        onClick={() => setMore((m) => !m)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm text-zinc-600 lg:hidden dark:text-zinc-300"
        aria-expanded={more}
      >
        Plus de critères{activeCount > 0 ? ` (${activeCount})` : ""}
        <ChevronRight className={cn("size-4 transition-transform", more && "rotate-90")} />
      </button>
      <div className={cn("divide-y divide-zinc-200 lg:block dark:divide-white/[0.06]", more ? "block" : "hidden")}>
        <Section title={kind === "room" ? "Participants" : "Passagers"}>
          <div className="flex items-center justify-between">
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              {kind === "room" ? "Nombre de personnes" : "Places nécessaires"}
            </span>
            <div className="flex items-center rounded-md border border-zinc-200 dark:border-white/10">
              <StepButton label="Moins" disabled={people <= 1} onClick={() => setPeople(people - 1)}>
                <Minus className="size-3.5" />
              </StepButton>
              <span className="w-8 text-center text-sm font-medium tabular-nums" aria-live="polite">
                {people}
              </span>
              <StepButton label="Plus" onClick={() => setPeople(people + 1)}>
                <Plus className="size-3.5" />
              </StepButton>
            </div>
          </div>
        </Section>

        {available.length > 0 && (
          <Section title="Équipements">
            <div className="space-y-0.5">
              {available.map((f) => {
                const { icon: Icon, label } = FEATURES[f];
                const on = features.includes(f);
                return (
                  <button
                    key={f}
                    onClick={() => toggleFeature(f)}
                    aria-pressed={on}
                    className="flex h-8 w-full items-center gap-2.5 rounded-md px-1.5 text-left text-sm text-zinc-700 transition-colors hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-white/[0.04]"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded border transition-colors",
                        on ? "border-brand-600 bg-brand-600 text-white" : "border-zinc-300 dark:border-white/20",
                      )}
                    >
                      {on && <Check className="size-3" strokeWidth={3} />}
                    </span>
                    <Icon className="size-4 text-zinc-400" strokeWidth={1.75} />
                    {label}
                  </button>
                );
              })}
            </div>
          </Section>
        )}

        {buildings.length > 1 && (
          <Section title="Site">
            <Select value={building ?? ""} onChange={(v) => setBuilding(v || null)}>
              <option value="">Tous les sites</option>
              {buildings.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </Select>
          </Section>
        )}
      </div>
      {filtered && (
        <div className="px-4 py-3">
          <button
            onClick={() => {
              setPeople(1);
              useBooking.setState({ features: [], building: null });
            }}
            className="text-xs text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:hover:text-zinc-100"
          >
            Réinitialiser les critères
          </button>
        </div>
      )}
    </div>
  );
}

function Section({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-4">
      {title && <p className="mb-2.5 text-xs font-medium text-zinc-500">{title}</p>}
      {children}
    </div>
  );
}

function Select({
  label,
  value,
  onChange,
  children,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {label && <span className="mb-1 block text-[11px] text-zinc-500">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-md border border-zinc-200 bg-white px-2.5 text-sm tabular-nums outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-zinc-900 dark:[color-scheme:dark]"
      >
        {children}
      </select>
    </label>
  );
}

function StepButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-8 items-center justify-center text-zinc-500 transition-colors hover:text-zinc-900 disabled:opacity-30 dark:hover:text-white"
    >
      {children}
    </button>
  );
}

/** Calendrier mensuel compact (bureau). */
function MiniCalendar() {
  const day = useBooking((s) => s.day);
  const setDay = useBooking((s) => s.setDay);
  const selected = parseDayKey(day);
  const [month, setMonth] = useState(startOfMonth(selected));
  const today = startOfDay(new Date());

  useEffect(() => setMonth(startOfMonth(parseDayKey(day))), [day]);

  const cells = useMemo(() => {
    const first = startOfWeek(startOfMonth(month), { weekStartsOn: 1 });
    const last = endOfWeek(endOfMonth(month), { weekStartsOn: 1 });
    const out: Date[] = [];
    for (let d = first; d <= last; d = addDays(d, 1)) out.push(d);
    return out;
  }, [month]);

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-sm font-medium capitalize">{format(month, "MMMM yyyy", { locale: frLocale })}</span>
        <div className="flex">
          <NavButton label="Mois précédent" disabled={month <= startOfMonth(today)} onClick={() => setMonth(addMonths(month, -1))}>
            <ChevronLeft className="size-4" />
          </NavButton>
          <NavButton label="Mois suivant" onClick={() => setMonth(addMonths(month, 1))}>
            <ChevronRight className="size-4" />
          </NavButton>
        </div>
      </div>
      <div className="grid grid-cols-7 text-center">
        {["L", "M", "M", "J", "V", "S", "D"].map((d, i) => (
          <span key={i} className="py-1 text-[11px] text-zinc-400">
            {d}
          </span>
        ))}
        {cells.map((d) => {
          const past = d < today;
          const active = isSameDay(d, selected);
          const inMonth = d.getMonth() === month.getMonth();
          const isToday = isSameDay(d, today);
          return (
            <button
              key={d.toISOString()}
              disabled={past}
              onClick={() => setDay(dayKey(d))}
              aria-pressed={active}
              aria-label={format(d, "EEEE d MMMM", { locale: frLocale })}
              className={cn(
                "relative mx-auto flex size-8 items-center justify-center rounded-md text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-25",
                active
                  ? "bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900"
                  : "hover:bg-zinc-100 dark:hover:bg-white/[0.06]",
                !inMonth && !active && "text-zinc-400 dark:text-zinc-600",
                isToday && !active && "font-semibold text-brand-600 dark:text-brand-400",
              )}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex size-7 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 disabled:opacity-30 dark:hover:bg-white/[0.06] dark:hover:text-white"
    >
      {children}
    </button>
  );
}

/** Bandeau de jours défilant (mobile). */
function DateStrip() {
  const day = useBooking((s) => s.day);
  const setDay = useBooking((s) => s.setDay);
  const today = startOfDay(new Date());
  const selected = parseDayKey(day);
  const days = useMemo(() => Array.from({ length: 30 }, (_, i) => addDays(today, i)), [today.getTime()]);
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.querySelector<HTMLElement>("[data-selected=true]")?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [day]);

  return (
    <div ref={scroller} className="scrollbar-none -mx-4 flex gap-1 overflow-x-auto px-4">
      {days.map((d, i) => {
        const active = isSameDay(d, selected);
        return (
          <button
            key={d.toISOString()}
            data-selected={active}
            onClick={() => setDay(dayKey(d))}
            aria-pressed={active}
            aria-label={format(d, "EEEE d MMMM", { locale: frLocale })}
            className={cn(
              "flex w-12 shrink-0 flex-col items-center rounded-md py-1.5 transition-colors",
              active ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900" : "text-zinc-600 dark:text-zinc-300",
              (d.getDay() === 0 || d.getDay() === 6) && !active && "opacity-50",
            )}
          >
            <span className="text-[10px] capitalize opacity-70">{i === 0 ? "Auj." : fmtWeekday(d)}</span>
            <span className="text-[15px] font-medium tabular-nums">{d.getDate()}</span>
            <span className="text-[10px] capitalize opacity-60">{fmtMonthShort(d)}</span>
          </button>
        );
      })}
    </div>
  );
}
