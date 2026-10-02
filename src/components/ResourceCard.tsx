import { CarFront, DoorOpen } from "lucide-react";
import { motion } from "motion/react";
import type { ResourceState } from "../lib/availability";
import { cn } from "../lib/cn";
import { FEATURES } from "../lib/features";
import { fmtTime, isSameDay, startOfDay } from "../lib/time";
import type { BusySlot, Resource } from "../types";
import { DayTimeline } from "./DayTimeline";
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

/** Ligne de résultat : identité de la ressource, frise de la journée, statut et action. */
export function ResourceCard({ resource, state, busy, start, end, past, onBook }: ResourceCardProps) {
  const free = state.status === "free";
  const sameDay = isSameDay(start, new Date(end.getTime() - 1));
  const meta = resource.kind === "room" ? [resource.building, resource.floor] : [resource.model, resource.plate, resource.location];

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="grid gap-x-6 gap-y-3 px-4 py-4 transition-colors hover:bg-zinc-50 sm:px-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] lg:items-center dark:hover:bg-white/[0.02]"
    >
      <div className="flex min-w-0 items-start gap-3.5">
        <Thumb resource={resource} />
        <div className="min-w-0">
          <div className="flex items-baseline gap-2">
            <h3 className="truncate font-medium">{resource.name}</h3>
            {resource.capacity !== undefined && (
              <span className="shrink-0 text-xs text-zinc-500 tabular-nums">
                {resource.capacity} {resource.kind === "room" ? "pers." : "places"}
              </span>
            )}
          </div>
          <p className="truncate text-[13px] text-zinc-500 dark:text-zinc-400">
            {meta.filter(Boolean).join(" · ") || resource.description || (resource.kind === "room" ? "Salle de réunion" : "Véhicule")}
          </p>
          {resource.features.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {resource.features.map((f) => {
                const { icon: Icon, label } = FEATURES[f];
                return (
                  <span key={f} className="inline-flex items-center gap-1 text-xs text-zinc-500 dark:text-zinc-400">
                    <Icon className="size-3.5" strokeWidth={1.75} /> {label}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="min-w-0">
        {sameDay ? (
          <DayTimeline day={startOfDay(start)} busy={busy} selection={{ start, end, ok: free && !past }} />
        ) : (
          <p className="text-xs text-zinc-500">Réservation sur plusieurs jours</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 lg:w-60 lg:justify-end">
        <Status state={state} feminine={resource.kind === "room"} />
        {state.status === "busy" ? (
          <Button size="sm" variant="secondary" disabled={!state.nextFree || past} onClick={() => state.nextFree && onBook(state.nextFree)}>
            {state.nextFree ? `Prendre ${fmtTime(state.nextFree)}` : "Complet"}
          </Button>
        ) : (
          <Button size="sm" disabled={!free || past} onClick={() => onBook()}>
            {past ? "Passé" : "Réserver"}
          </Button>
        )}
      </div>
    </motion.article>
  );
}

function Thumb({ resource }: { resource: Resource }) {
  const Icon = resource.kind === "room" ? DoorOpen : CarFront;
  if (resource.image) return <img src={resource.image} alt="" className="size-10 shrink-0 rounded-md object-cover" loading="lazy" />;
  return (
    <span className="flex size-10 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 dark:border-white/[0.08] dark:bg-white/[0.03] dark:text-zinc-400">
      <Icon className="size-[18px]" strokeWidth={1.75} />
    </span>
  );
}

function Status({ state, feminine }: { state: ResourceState; feminine: boolean }) {
  const dot = (color: string) => <span className={cn("size-1.5 shrink-0 rounded-full", color)} />;
  const base = "flex items-center gap-2 text-[13px] whitespace-nowrap";
  switch (state.status) {
    case "loading":
      return <span className="skeleton h-4 w-20" />;
    case "free":
      return (
        <span className={cn(base, "text-emerald-700 dark:text-emerald-400")}>
          {dot("bg-emerald-500")}
          {state.freeUntil ? `Libre jusqu'à ${fmtTime(state.freeUntil)}` : "Disponible"}
        </span>
      );
    case "busy":
      return (
        <span className={cn(base, "text-zinc-500 dark:text-zinc-400")} title={state.conflicts[0]?.subject}>
          {dot("bg-rose-500")}
          {feminine ? "Occupée" : "Occupé"}
        </span>
      );
    default:
      return (
        <span className={cn(base, "text-zinc-500")} title={state.error}>
          {dot("bg-zinc-400")}
          Indisponible
        </span>
      );
  }
}

export function ResourceCardSkeleton() {
  return (
    <div className="flex items-center gap-4 px-5 py-5">
      <div className="skeleton size-10 rounded-md" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-4 w-40" />
        <div className="skeleton h-3 w-64 max-w-full" />
      </div>
      <div className="skeleton hidden h-2.5 w-72 rounded-full lg:block" />
      <div className="skeleton h-8 w-20 rounded-md" />
    </div>
  );
}
