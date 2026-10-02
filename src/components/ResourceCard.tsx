import { ArrowRight, Battery, Building, CalendarClock, CarFront, MapPin, Users } from "lucide-react";
import { motion } from "motion/react";
import type { ResourceState } from "../lib/availability";
import { cn } from "../lib/cn";
import { FEATURES } from "../lib/features";
import { fmtTime, isSameDay, startOfDay } from "../lib/time";
import type { BusySlot, Resource } from "../types";
import { DayTimeline } from "./DayTimeline";
import { ResourceVisual } from "./ResourceVisual";
import { Button } from "./ui/Button";

interface ResourceCardProps {
  resource: Resource;
  state: ResourceState;
  busy: BusySlot[] | undefined;
  start: Date;
  end: Date;
  past: boolean;
  onBook: (start?: Date) => void;
  index: number;
}

export function ResourceCard({ resource, state, busy, start, end, past, onBook, index }: ResourceCardProps) {
  const free = state.status === "free";
  const sameDay = isSameDay(start, new Date(end.getTime() - 1));

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ type: "spring", damping: 30, stiffness: 300, delay: Math.min(index * 0.035, 0.3) }}
      className={cn(
        "group card flex flex-col overflow-hidden transition-shadow duration-300 hover:shadow-[var(--shadow-lift)]",
        !free && state.status !== "loading" && "opacity-[0.92]",
      )}
    >
      <div className="relative">
        <ResourceVisual
          resource={resource}
          className={cn(
            "h-32 transition-transform duration-500 group-hover:scale-[1.03]",
            !free && state.status === "busy" && "saturate-[0.55]",
          )}
        />
        <div className="absolute top-3 left-3">
          <StateBadge state={state} past={past} feminine={resource.kind === "room"} />
        </div>
        {resource.capacity !== undefined && (
          <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-black/25 px-2.5 py-1 text-xs font-semibold text-white backdrop-blur-md">
            <Users className="size-3.5" />
            {resource.capacity}
            <span className="sr-only">{resource.kind === "room" ? "personnes" : "places"}</span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div>
          <h3 className="text-[17px] font-semibold tracking-tight text-slate-900 dark:text-white">{resource.name}</h3>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-[13px] text-slate-500 dark:text-slate-400">
            {resource.kind === "room" ? (
              <>
                <Building className="size-3.5 shrink-0" />
                {[resource.building, resource.floor].filter(Boolean).join(" · ") || resource.description || "Salle de réunion"}
              </>
            ) : (
              <>
                <CarFront className="size-3.5 shrink-0" />
                {[resource.model, resource.plate].filter(Boolean).join(" · ")}
              </>
            )}
          </p>
          {resource.kind === "vehicle" && (resource.location || resource.rangeKm) && (
            <p className="mt-1 flex items-center gap-3 text-[12px] text-slate-500 dark:text-slate-400">
              {resource.location && (
                <span className="flex items-center gap-1 truncate">
                  <MapPin className="size-3.5 shrink-0" /> {resource.location}
                </span>
              )}
              {resource.rangeKm && (
                <span className="flex shrink-0 items-center gap-1">
                  <Battery className="size-3.5" /> {resource.rangeKm} km
                </span>
              )}
            </p>
          )}
        </div>

        {resource.features.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {resource.features.map((f) => {
              const { icon: Icon, label } = FEATURES[f];
              return (
                <span
                  key={f}
                  className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-1 text-[11px] font-medium text-slate-600 dark:bg-white/[0.06] dark:text-slate-300"
                >
                  <Icon className="size-3" /> {label}
                </span>
              );
            })}
          </div>
        )}

        {sameDay && (
          <DayTimeline day={startOfDay(start)} busy={busy} selection={{ start, end, ok: free && !past }} className="mt-auto pt-1" />
        )}

        <div className={cn("space-y-2", !sameDay && "mt-auto")}>
          {state.status === "busy" ? (
            <>
              <p className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                {state.conflicts[0]?.subject
                  ? `${resource.kind === "room" ? "Réservée" : "Réservé"} · ${state.conflicts[0].subject}`
                  : `Déjà ${resource.kind === "room" ? "réservée" : "réservé"} sur ce créneau`}
              </p>
              <Button
                className="w-full"
                variant="soft"
                icon={<CalendarClock />}
                disabled={!state.nextFree || past}
                onClick={() => state.nextFree && onBook(state.nextFree)}
              >
                {state.nextFree
                  ? `Réserver à ${fmtTime(state.nextFree)} – ${fmtTime(new Date(state.nextFree.getTime() + (end.getTime() - start.getTime())))}`
                  : "Complet sur cette période"}
              </Button>
            </>
          ) : (
            <Button
              className="w-full"
              size="md"
              disabled={!free || past}
              onClick={() => onBook()}
              iconRight={<ArrowRight className="transition-transform group-hover:translate-x-0.5" />}
            >
              {past ? "Créneau passé" : `Réserver ${fmtTime(start)} – ${fmtTime(end)}`}
            </Button>
          )}
        </div>
      </div>
    </motion.article>
  );
}

function StateBadge({ state, past, feminine }: { state: ResourceState; past: boolean; feminine: boolean }) {
  const base = "flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm backdrop-blur-md";
  switch (state.status) {
    case "loading":
      return <span className={cn(base, "w-24 bg-white/60")}>&nbsp;</span>;
    case "free":
      return (
        <span className={cn(base, "bg-white/90 text-emerald-700 dark:bg-slate-950/70 dark:text-emerald-300")}>
          <span className={cn("size-2 rounded-full bg-emerald-500", !past && "animate-pulse-ring")} />
          {state.freeUntil ? `Libre jusqu'à ${fmtTime(state.freeUntil)}` : "Disponible"}
        </span>
      );
    case "busy":
      return (
        <span
          className={cn(
            base,
            "bg-white/90 dark:bg-slate-950/70",
            state.nextFree ? "text-amber-700 dark:text-amber-300" : "text-rose-700 dark:text-rose-300",
          )}
        >
          <span className={cn("size-2 rounded-full", state.nextFree ? "bg-amber-500" : "bg-rose-500")} />
          {state.nextFree ? `Libre à ${fmtTime(state.nextFree)}` : feminine ? "Occupée" : "Occupé"}
        </span>
      );
    default:
      return (
        <span className={cn(base, "bg-white/90 text-slate-600 dark:bg-slate-950/70 dark:text-slate-300")} title={state.error}>
          <span className="size-2 rounded-full bg-slate-400" />
          Indisponible
        </span>
      );
  }
}

export function ResourceCardSkeleton() {
  return (
    <div className="card overflow-hidden">
      <div className="skeleton h-32 rounded-none" />
      <div className="space-y-3 p-4">
        <div className="skeleton h-5 w-1/2" />
        <div className="skeleton h-4 w-3/4" />
        <div className="flex gap-1.5">
          <div className="skeleton h-6 w-16" />
          <div className="skeleton h-6 w-14" />
        </div>
        <div className="skeleton h-3 w-full rounded-full" />
        <div className="skeleton h-10 w-full rounded-2xl" />
      </div>
    </div>
  );
}
