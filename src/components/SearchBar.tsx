import { CalendarDays, ChevronDown, Clock, Hourglass, Minus, Plus, Search, Users, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { config } from "../config";
import { cn } from "../lib/cn";
import { FEATURES, FILTERABLE } from "../lib/features";
import { combine, fmtDuration, format, frLocale, isSameDay, parseDayKey, timeOptions } from "../lib/time";
import { useBooking } from "../store";
import type { Resource, ResourceKind } from "../types";
import { MiniCalendar } from "./MiniCalendar";
import { Popover } from "./ui/Popover";

const DURATIONS: Record<ResourceKind, number[]> = {
  room: [15, 30, 45, 60, 90, 120, 180, 240, 360, 480, 600],
  vehicle: [60, 120, 180, 240, 360, 480, 1440, 2880, 4320, 7200, 10080],
};

function durationLabel(kind: ResourceKind, m: number) {
  if (kind === "vehicle" && m === 240) return "Demi-journée";
  if (kind === "vehicle" && m === 480) return "Journée";
  if (m === 10080) return "1 semaine";
  if (m >= 1440 && m % 1440 === 0) return `${m / 1440} jour${m > 1440 ? "s" : ""}`;
  return fmtDuration(m);
}

/** Barre de recherche : quand, combien de temps, pour combien de personnes. */
export function SearchBar() {
  const kind = useBooking((s) => s.kind);
  const day = useBooking((s) => s.day);
  const time = useBooking((s) => s.time);
  const setTime = useBooking((s) => s.setTime);
  const duration = useBooking((s) => s.duration);
  const setDuration = useBooking((s) => s.setDuration);
  const people = useBooking((s) => s.people);
  const setPeople = useBooking((s) => s.setPeople);
  const [calendar, setCalendar] = useState(false);

  const date = parseDayKey(day);
  const today = isSameDay(date, new Date());
  const base = timeOptions(config.dayStartHour, config.dayEndHour, 15).slice(0, -1);
  const times = base.includes(time) ? base : [...base, time].sort();
  const durations = DURATIONS[kind].includes(duration) ? DURATIONS[kind] : [...DURATIONS[kind], duration].sort((a, b) => a - b);
  const now = new Date();

  return (
    <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-line bg-[var(--line)] md:flex md:rounded-full">
      <Popover
        open={calendar}
        onOpenChange={setCalendar}
        className="w-[300px]"
        trigger={
          <Segment label="Date" icon={<CalendarDays />} className="col-span-2 md:flex-[1.4]">
            <span className="first-letter:uppercase">{today ? "Aujourd'hui" : format(date, "EEE d MMMM", { locale: frLocale })}</span>
          </Segment>
        }
      >
        <MiniCalendar onPick={() => setCalendar(false)} />
      </Popover>

      <SelectSegment label="Début" icon={<Clock />} value={time} onChange={setTime}>
        {times.map((t) => (
          <option key={t} value={t} disabled={combine(day, t) < new Date(now.getTime() - 5 * 60000)}>
            {t}
          </option>
        ))}
      </SelectSegment>

      <SelectSegment label="Durée" icon={<Hourglass />} value={String(duration)} onChange={(v) => setDuration(Number(v))}>
        {durations.map((m) => (
          <option key={m} value={m}>
            {durationLabel(kind, m)}
          </option>
        ))}
      </SelectSegment>

      <div className="col-span-2 flex items-center justify-between gap-3 bg-[var(--bg)] px-6 py-3 md:flex-1">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted uppercase">
            <Users className="size-3" /> {kind === "room" ? "Personnes" : "Places"}
          </p>
          <p className="text-[15px] font-medium tabular-nums">{people}</p>
        </div>
        <div className="flex items-center gap-1">
          <RoundButton label="Moins" disabled={people <= 1} onClick={() => setPeople(people - 1)}>
            <Minus className="size-3.5" />
          </RoundButton>
          <RoundButton label="Plus" onClick={() => setPeople(people + 1)}>
            <Plus className="size-3.5" />
          </RoundButton>
        </div>
      </div>
    </div>
  );
}

function Segment({
  label,
  icon,
  children,
  className,
  ...props
}: { label: string; icon: ReactNode; children: ReactNode; className?: string } & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      {...props}
      className={cn("flex flex-col items-start bg-[var(--bg)] px-6 py-3 text-left transition-colors hover:bg-surface", className)}
    >
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted uppercase [&_svg]:size-3">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-[15px] font-medium">
        {children}
        <ChevronDown className="size-3.5 text-muted" />
      </span>
    </button>
  );
}

function SelectSegment({
  label,
  icon,
  value,
  onChange,
  children,
}: {
  label: string;
  icon: ReactNode;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <label className="relative flex cursor-pointer flex-col bg-[var(--bg)] px-6 py-3 transition-colors hover:bg-surface md:flex-1">
      <span className="flex items-center gap-1.5 text-[11px] font-medium tracking-wide text-muted uppercase [&_svg]:size-3">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-1 text-[15px] font-medium tabular-nums">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full cursor-pointer appearance-none bg-transparent pr-5 outline-none dark:[color-scheme:dark]"
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-5 bottom-4 size-3.5 text-muted" />
      </span>
    </label>
  );
}

function RoundButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-8 items-center justify-center rounded-full border border-line transition-colors hover:bg-surface disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** Filtres secondaires : équipements, site, recherche, disponibles uniquement. */
export function FilterChips({
  resources,
  onlyFree,
  setOnlyFree,
}: {
  resources: Resource[] | undefined;
  onlyFree: boolean;
  setOnlyFree: (v: boolean) => void;
}) {
  const kind = useBooking((s) => s.kind);
  const features = useBooking((s) => s.features);
  const toggleFeature = useBooking((s) => s.toggleFeature);
  const building = useBooking((s) => s.building);
  const setBuilding = useBooking((s) => s.setBuilding);
  const query = useBooking((s) => s.query);
  const setQuery = useBooking((s) => s.setQuery);
  const buildings = [...new Set((resources ?? []).map((r) => r.building).filter((b): b is string => Boolean(b)))].sort();
  const available = FILTERABLE[kind].filter((f) => (resources ?? []).some((r) => r.features.includes(f)));

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
        <Chip on={onlyFree} onClick={() => setOnlyFree(!onlyFree)}>
          Disponibles
        </Chip>
        {available.map((f) => (
          <Chip key={f} on={features.includes(f)} onClick={() => toggleFeature(f)}>
            {FEATURES[f].label}
          </Chip>
        ))}
        {buildings.length > 1 &&
          buildings.map((b) => (
            <Chip key={b} on={building === b} onClick={() => setBuilding(building === b ? null : b)}>
              {b}
            </Chip>
          ))}
      </div>
      <div className="relative md:ml-auto md:w-60">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === "room" ? "Rechercher une salle" : "Modèle, plaque…"}
          aria-label="Rechercher"
          className="h-9 w-full rounded-full border border-line bg-transparent pr-8 pl-10 text-sm outline-none placeholder:text-muted focus:border-zinc-400"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute top-1/2 right-2.5 -translate-y-1/2 p-1 text-muted" aria-label="Effacer">
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        "h-9 shrink-0 rounded-full border px-4 text-[13px] whitespace-nowrap transition-colors",
        on
          ? "border-transparent bg-zinc-950 text-white dark:bg-white dark:text-zinc-950"
          : "border-line text-zinc-700 hover:bg-surface dark:text-zinc-300",
      )}
    >
      {children}
    </button>
  );
}
