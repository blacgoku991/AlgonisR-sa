import { motion } from "motion/react";
import type { ResourceState } from "../lib/availability";
import { cn } from "../lib/cn";
import { FEATURES } from "../lib/features";
import { fmtTime, isSameDay, startOfDay } from "../lib/time";
import type { BusySlot, Resource } from "../types";
import { DayTimeline } from "./DayTimeline";
import { ResourceArt } from "./ResourceArt";
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

export function ResourceCard({ resource, state, busy, start, end, past, onBook }: ResourceCardProps) {
  const free = state.status === "free";
  const sameDay = isSameDay(start, new Date(end.getTime() - 1));
  const meta = resource.kind === "room" ? [resource.building, resource.floor] : [resource.model, resource.plate];
  const dimmed = state.status === "busy" || state.status === "unknown";
  const capacity = resource.capacity !== undefined ? `${resource.capacity} ${resource.kind === "room" ? "pers." : "places"}` : null;

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25, ease: [0.2, 0.8, 0.2, 1] }}
      className="group flex flex-col"
    >
      <div className="relative overflow-hidden rounded-3xl">
        <ResourceArt
          resource={resource}
          className={cn("aspect-[16/10] transition-transform duration-500 group-hover:scale-[1.02]", dimmed && "opacity-40")}
        />
        <span className="absolute top-3 left-3">
          <Status state={state} feminine={resource.kind === "room"} />
        </span>
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="truncate text-[17px] font-semibold tracking-tight">{resource.name}</h3>
          <p className="mt-0.5 truncate text-sm text-muted">{[...meta, capacity].filter(Boolean).join(" · ")}</p>
        </div>
        {state.status === "busy" ? (
          <Button
            size="sm"
            variant="secondary"
            disabled={!state.nextFree || past}
            onClick={() => state.nextFree && onBook(state.nextFree)}
            title={state.nextFree ? "Réserver au prochain créneau libre" : undefined}
          >
            {state.nextFree ? `À ${fmtTime(state.nextFree)}` : "Complet"}
          </Button>
        ) : (
          <Button size="sm" disabled={!free || past} onClick={() => onBook()}>
            {past ? "Passé" : "Réserver"}
          </Button>
        )}
      </div>

      {resource.features.length > 0 && (
        <p className="mt-1.5 truncate px-1 text-xs text-muted">{resource.features.map((f) => FEATURES[f].label).join(" · ")}</p>
      )}

      {sameDay && (
        <div className="mt-3 px-1">
          <DayTimeline day={startOfDay(start)} busy={busy} selection={{ start, end, ok: free && !past }} />
        </div>
      )}
    </motion.article>
  );
}

function Status({ state, feminine }: { state: ResourceState; feminine: boolean }) {
  const base = "inline-flex items-center gap-1.5 rounded-full bg-[var(--bg)] px-2.5 py-1 text-xs font-medium shadow-sm";
  switch (state.status) {
    case "loading":
      return <span className={cn(base, "w-20")}>&nbsp;</span>;
    case "free":
      return (
        <span className={base}>
          <span className="size-1.5 rounded-full bg-emerald-500" />
          {state.freeUntil ? `Libre jusqu'à ${fmtTime(state.freeUntil)}` : "Disponible"}
        </span>
      );
    case "busy":
      return (
        <span className={cn(base, "text-muted")}>
          <span className="size-1.5 rounded-full bg-zinc-400" />
          {state.nextFree ? `Libre à ${fmtTime(state.nextFree)}` : feminine ? "Occupée" : "Occupé"}
        </span>
      );
    default:
      return (
        <span className={cn(base, "text-muted")} title={state.error}>
          Indisponible
        </span>
      );
  }
}

export function ResourceCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-[16/10] rounded-3xl" />
      <div className="skeleton mt-4 h-4 w-32" />
      <div className="skeleton mt-2 h-3 w-48" />
    </div>
  );
}
