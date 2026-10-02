import { addMonths, endOfMonth, endOfWeek, startOfMonth, startOfWeek } from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { cn } from "../lib/cn";
import { addDays, dayKey, format, frLocale, isSameDay, parseDayKey, startOfDay } from "../lib/time";
import { useBooking } from "../store";

/** Calendrier mensuel compact (bureau). */
export function MiniCalendar({ onPick }: { onPick?: () => void }) {
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
              onClick={() => {
                setDay(dayKey(d));
                onPick?.();
              }}
              aria-pressed={active}
              aria-label={format(d, "EEEE d MMMM", { locale: frLocale })}
              className={cn(
                "relative mx-auto flex size-9 items-center justify-center rounded-full text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:opacity-25",
                active ? "bg-zinc-900 font-medium text-white dark:bg-white dark:text-zinc-900" : "hover:bg-surface-2",
                !inMonth && !active && "text-zinc-400 dark:text-zinc-600",
                isToday && !active && "font-semibold underline underline-offset-4",
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
      className="flex size-7 items-center justify-center rounded-full text-muted hover:bg-surface-2 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
