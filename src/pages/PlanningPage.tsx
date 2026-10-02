import { addMinutes } from "date-fns";
import { ChevronLeft, ChevronRight, MousePointerClick, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { toast } from "sonner";
import { KindToggle } from "../components/KindToggle";
import { Button } from "../components/ui/Button";
import { config } from "../config";
import { useAvailability, useMyBookings, useResources } from "../hooks/queries";
import { conflictsWith, isBlocking, matchesFilters } from "../lib/availability";
import { cn } from "../lib/cn";
import { KIND_LABEL } from "../lib/features";
import { addDays, dayKey, fmtLongDate, fmtTime, isSameDay, parseDayKey, startOfDay } from "../lib/time";
import { useBooking } from "../store";
import type { BusySlot, Resource } from "../types";

const HOUR_WIDTH = 104;
const Q_WIDTH = HOUR_WIDTH / 4;
const ROW_HEIGHT = 68;

interface Drag {
  resource: Resource;
  anchor: number;
  current: number;
}

export function PlanningPage() {
  const kind = useBooking((s) => s.kind);
  const setKind = useBooking((s) => s.setKind);
  const day = useBooking((s) => s.day);
  const setDay = useBooking((s) => s.setDay);
  const duration = useBooking((s) => s.duration);
  const people = useBooking((s) => s.people);
  const features = useBooking((s) => s.features);
  const building = useBooking((s) => s.building);
  const open = useBooking((s) => s.open);

  const date = parseDayKey(day);
  const from = startOfDay(date);
  const to = addDays(from, 1);
  const { data: resources, isLoading } = useResources(kind);
  const { data: availability } = useAvailability(kind, resources, from, to);
  const { data: myBookings } = useMyBookings();
  const mine = useMemo(
    () => new Set((myBookings ?? []).map((b) => `${b.resourceEmail?.toLowerCase()}|${b.start.getTime()}|${b.end.getTime()}`)),
    [myBookings],
  );

  const rows = useMemo(
    () => (resources ?? []).filter((r) => matchesFilters(r, { people, features, building, query: "" })),
    [resources, people, features, building],
  );

  const hours = config.dayEndHour - config.dayStartHour;
  const gridWidth = hours * HOUR_WIDTH;
  const dayStart = addMinutes(from, config.dayStartHour * 60);
  const quarterToDate = (q: number) => addMinutes(dayStart, q * 15);
  const xOf = (d: Date) => ((d.getTime() - dayStart.getTime()) / 3_600_000) * HOUR_WIDTH;
  const now = new Date();
  const isToday = isSameDay(date, now);
  const nowX = xOf(now);

  const scroller = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!scroller.current) return;
    const target = isToday ? Math.max(0, nowX - 2 * HOUR_WIDTH) : xOf(addMinutes(from, 8 * 60)) - 20;
    scroller.current.scrollTo({ left: Math.max(0, target), behavior: "smooth" });
  }, [day, kind, rows.length > 0]);

  const [drag, setDrag] = useState<Drag | null>(null);
  const [hover, setHover] = useState<{ id: string; q: number } | null>(null);

  const quarterAt = (e: ReactPointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    return Math.max(0, Math.min(hours * 4 - 1, Math.floor((e.clientX - rect.left) / Q_WIDTH)));
  };

  const tryOpen = (resource: Resource, startQ: number, endQ: number) => {
    const start = quarterToDate(startQ);
    const end = quarterToDate(endQ);
    if (start < addMinutes(new Date(), -5)) {
      toast.warning("Ce créneau est déjà passé");
      return;
    }
    const busy = availability?.[resource.id]?.busy ?? [];
    const conflict = conflictsWith(busy, start, end)[0];
    if (conflict) {
      toast.error(`${resource.name} est déjà réservé${resource.kind === "room" ? "e" : ""}`, {
        description: `${fmtTime(conflict.start)} – ${fmtTime(conflict.end)}${conflict.subject ? ` · ${conflict.subject}` : ""}`,
      });
      return;
    }
    open({ resource, start, end });
  };

  const onPointerDown = (resource: Resource) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.pointerType === "touch") return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const q = quarterAt(e);
    setDrag({ resource, anchor: q, current: q });
  };

  const onPointerMove = (resource: Resource) => (e: ReactPointerEvent<HTMLDivElement>) => {
    const q = quarterAt(e);
    if (drag && drag.resource.id === resource.id) setDrag({ ...drag, current: q });
    else if (e.pointerType !== "touch") setHover({ id: resource.id, q });
  };

  const onPointerUp = (resource: Resource) => (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerType === "touch") {
      const q = quarterAt(e);
      tryOpen(resource, q, q + Math.max(1, Math.round(duration / 15)));
      return;
    }
    if (!drag || drag.resource.id !== resource.id) return;
    const a = Math.min(drag.anchor, drag.current);
    const b = Math.max(drag.anchor, drag.current);
    setDrag(null);
    tryOpen(resource, a, a === b ? a + Math.max(1, Math.round(Math.min(duration, 240) / 15)) : b + 1);
  };

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Planning</h1>
          <p className="mt-1 flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <MousePointerClick className="size-4" /> Cliquez ou glissez sur un créneau libre pour réserver.
          </p>
        </div>
        <KindToggle value={kind} onChange={setKind} id="planning-kind" compact />
      </header>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 border-b border-zinc-200/80 px-4 py-3 dark:border-white/10">
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="px-2"
              aria-label="Jour précédent"
              onClick={() => setDay(dayKey(addDays(date, -1)))}
            >
              <ChevronLeft />
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setDay(dayKey(new Date()))} disabled={isToday}>
              Aujourd'hui
            </Button>
            <Button variant="ghost" size="sm" className="px-2" aria-label="Jour suivant" onClick={() => setDay(dayKey(addDays(date, 1)))}>
              <ChevronRight />
            </Button>
          </div>
          <motion.h2 key={day} initial={{ opacity: 0, x: 6 }} animate={{ opacity: 1, x: 0 }} className="text-[15px] font-semibold">
            {fmtLongDate(date)}
          </motion.h2>
          <Legend />
        </div>

        <div className="flex">
          {/* Colonne des ressources */}
          <div className="w-36 shrink-0 border-r border-zinc-200/80 sm:w-52 dark:border-white/10">
            <div className="h-10 border-b border-zinc-200/80 dark:border-white/10" />
            {isLoading &&
              Array.from({ length: 5 }, (_, i) => (
                <div key={i} className="flex items-center px-4" style={{ height: ROW_HEIGHT }}>
                  <div className="skeleton h-4 w-24" />
                </div>
              ))}
            {rows.map((r) => (
              <div
                key={r.id}
                className="flex flex-col justify-center border-b border-zinc-100 px-3 last:border-b-0 sm:px-4 dark:border-white/5"
                style={{ height: ROW_HEIGHT }}
              >
                <p className="flex items-center gap-2 truncate text-sm font-semibold">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ background: `oklch(0.62 0.18 ${r.hue ?? 250})` }} />
                  <span className="truncate">{r.name}</span>
                </p>
                <p className="mt-0.5 flex items-center gap-1 truncate pl-[18px] text-xs text-zinc-500 dark:text-zinc-400">
                  {r.capacity !== undefined && (
                    <>
                      <Users className="size-3" /> {r.capacity}
                      <span className="mx-0.5">·</span>
                    </>
                  )}
                  <span className="truncate">{r.kind === "room" ? (r.floor ?? r.building) : r.plate}</span>
                </p>
              </div>
            ))}
          </div>

          {/* Grille horaire */}
          <div ref={scroller} className="scrollbar-thin relative min-w-0 flex-1 overflow-x-auto">
            <div className="relative" style={{ width: gridWidth }}>
              <div className="sticky top-0 z-10 flex h-10 border-b border-zinc-200/80 bg-white/60 backdrop-blur dark:border-white/10 dark:bg-transparent">
                {Array.from({ length: hours }, (_, i) => (
                  <div
                    key={i}
                    className="relative shrink-0 border-l border-zinc-200/70 first:border-l-0 dark:border-white/[0.06]"
                    style={{ width: HOUR_WIDTH }}
                  >
                    <span className="absolute top-2.5 left-2 text-xs font-semibold text-zinc-400 tabular-nums">
                      {String(config.dayStartHour + i).padStart(2, "0")}:00
                    </span>
                  </div>
                ))}
              </div>

              {rows.map((r) => {
                const busy = (availability?.[r.id]?.busy ?? []).filter(isBlocking);
                const dragging = drag?.resource.id === r.id ? drag : null;
                const hovering = !drag && hover?.id === r.id ? hover : null;
                return (
                  <div
                    key={r.id}
                    className="relative touch-pan-x border-b border-zinc-100 last:border-b-0 dark:border-white/5"
                    style={{ height: ROW_HEIGHT }}
                    onPointerDown={onPointerDown(r)}
                    onPointerMove={onPointerMove(r)}
                    onPointerUp={onPointerUp(r)}
                    onPointerLeave={() => setHover(null)}
                  >
                    {/* lignes horaires */}
                    {Array.from({ length: hours }, (_, i) => (
                      <div
                        key={i}
                        className="absolute inset-y-0 border-l border-zinc-100 dark:border-white/[0.05]"
                        style={{ left: i * HOUR_WIDTH }}
                      >
                        <div
                          className="absolute inset-y-3 border-l border-dashed border-zinc-100 dark:border-white/[0.04]"
                          style={{ left: HOUR_WIDTH / 2 }}
                        />
                      </div>
                    ))}
                    {isToday && nowX > 0 && (
                      <div className="hatched absolute inset-y-0 left-0 opacity-50" style={{ width: Math.min(nowX, gridWidth) }} />
                    )}

                    {busy.map((slot, i) => (
                      <BusyBlock
                        key={i}
                        slot={slot}
                        mine={slot.optimistic || mine.has(`${r.id}|${slot.start.getTime()}|${slot.end.getTime()}`)}
                        x={xOf(slot.start)}
                        w={xOf(slot.end) - xOf(slot.start)}
                        max={gridWidth}
                      />
                    ))}

                    {hovering && (
                      <div
                        className="pointer-events-none absolute inset-y-2 rounded-md border-2 border-dashed border-brand-400/70 bg-brand-500/5"
                        style={{ left: hovering.q * Q_WIDTH, width: Q_WIDTH * Math.max(1, Math.round(Math.min(duration, 240) / 15)) }}
                      >
                        <span className="absolute top-1 left-1.5 text-[11px] font-semibold text-brand-600 tabular-nums dark:text-brand-300">
                          {fmtTime(quarterToDate(hovering.q))}
                        </span>
                      </div>
                    )}

                    {dragging && (
                      <div
                        className="bg-brand-600 pointer-events-none absolute inset-y-2 rounded-md px-2 py-1 text-[11px] font-semibold text-white"
                        style={{
                          left: Math.min(dragging.anchor, dragging.current) * Q_WIDTH,
                          width: (Math.abs(dragging.current - dragging.anchor) + 1) * Q_WIDTH,
                        }}
                      >
                        {fmtTime(quarterToDate(Math.min(dragging.anchor, dragging.current)))} –{" "}
                        {fmtTime(quarterToDate(Math.max(dragging.anchor, dragging.current) + 1))}
                      </div>
                    )}
                  </div>
                );
              })}

              {isToday && nowX > 0 && nowX < gridWidth && (
                <div className="pointer-events-none absolute top-8 bottom-0 z-[5] w-0.5 bg-rose-500" style={{ left: nowX }}>
                  <span className="absolute -top-1 -left-[5px] size-3 rounded-full bg-rose-500 ring-4 ring-rose-500/20" />
                </div>
              )}
            </div>
          </div>
        </div>

        {!isLoading && rows.length === 0 && (
          <p className="px-6 py-12 text-center text-sm text-zinc-500">
            Aucun{kind === "room" ? "e" : ""} {KIND_LABEL[kind].one} à afficher.
          </p>
        )}
      </div>
    </div>
  );
}

function BusyBlock({ slot, mine, x, w, max }: { slot: BusySlot; mine?: boolean; x: number; w: number; max: number }) {
  const left = Math.max(0, x);
  const width = Math.min(max, x + w) - left;
  if (width <= 0) return null;
  return (
    <div
      onPointerDown={(e) => e.stopPropagation()}
      title={`${fmtTime(slot.start)} – ${fmtTime(slot.end)}${slot.subject ? ` · ${slot.subject}` : ""}`}
      className={cn(
        "absolute inset-y-2 cursor-not-allowed overflow-hidden rounded-md border px-2 py-1 text-[11px] leading-tight",
        mine
          ? "bg-brand-600 border-transparent text-white"
          : slot.status === "tentative"
            ? "border-amber-300/70 bg-amber-100/80 text-amber-900 dark:border-amber-400/30 dark:bg-amber-400/15 dark:text-amber-100"
            : "border-zinc-200 bg-zinc-100 text-zinc-600 dark:border-white/10 dark:bg-white/[0.07] dark:text-zinc-300",
      )}
      style={{ left: left + 1, width: width - 2 }}
    >
      <p className="truncate font-semibold">{slot.subject ?? "Occupé"}</p>
      <p className="truncate tabular-nums opacity-70">
        {fmtTime(slot.start)} – {fmtTime(slot.end)}
      </p>
    </div>
  );
}

function Legend() {
  return (
    <div className="ml-auto hidden items-center gap-4 text-xs text-zinc-500 md:flex dark:text-zinc-400">
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-zinc-200 bg-zinc-100 dark:border-white/10 dark:bg-white/10" /> Réservé
      </span>
      <span className="flex items-center gap-1.5">
        <span className="size-3 rounded border border-amber-300 bg-amber-100" /> Provisoire
      </span>
      <span className="flex items-center gap-1.5">
        <span className="bg-brand-600 size-3 rounded" /> Vos réservations
      </span>
      <span className="flex items-center gap-1.5">
        <span className="h-3 w-0.5 bg-rose-500" /> Maintenant
      </span>
    </div>
  );
}
