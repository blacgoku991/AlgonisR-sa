import { CarFront, Check, ChevronDown, ChevronLeft, ChevronRight, DoorOpen, Users } from "lucide-react";
import { motion, type PanInfo } from "motion/react";
import { DropdownMenu } from "radix-ui";
import { useEffect, useState } from "react";
import type { ResourceState } from "../lib/availability";
import { cn } from "../lib/cn";
import { FEATURES } from "../lib/features";
import { fmtTime, isSameDay, startOfDay } from "../lib/time";
import type { BusySlot, Resource } from "../types";
import { DayTimeline } from "./DayTimeline";
import { ResourceArt } from "./ResourceArt";
import { Status } from "./ResourceCard";
import { Button } from "./ui/Button";

export interface CarouselItem {
  resource: Resource;
  state: ResourceState;
}

interface ResourceCarouselProps {
  items: CarouselItem[];
  busyOf: (id: string) => BusySlot[] | undefined;
  start: Date;
  end: Date;
  past: boolean;
  onBook: (resource: Resource, at?: Date) => void;
}

/**
 * Carrousel 3D : la ressource sélectionnée est au centre, les voisines s'éloignent en perspective.
 * Navigation : flèches, glisser, clavier (← →), clic sur une voisine ou menu déroulant.
 */
export function ResourceCarousel({ items, busyOf, start, end, past, onBook }: ResourceCarouselProps) {
  const [active, setActive] = useState(0);
  const count = items.length;
  const current = items[Math.min(active, count - 1)];

  // Revenir au début quand la liste change (filtres, type de ressource…).
  const key = items.map((i) => i.resource.id).join("|");
  useEffect(() => setActive(0), [key]);

  const go = (i: number) => setActive(Math.max(0, Math.min(count - 1, i)));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && /INPUT|SELECT|TEXTAREA/.test(target.tagName)) return;
      if (document.querySelector("[role=dialog]")) return;
      if (e.key === "ArrowRight") setActive((a) => Math.min(count - 1, a + 1));
      if (e.key === "ArrowLeft") setActive((a) => Math.max(0, a - 1));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [count]);

  if (!current) return null;

  const onDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -60 || info.velocity.x < -400) go(active + 1);
    else if (info.offset.x > 60 || info.velocity.x > 400) go(active - 1);
  };

  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Picker items={items} active={active} onPick={go} />
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted tabular-nums">
            {active + 1} / {count}
          </span>
          <ArrowButton label="Précédent" disabled={active === 0} onClick={() => go(active - 1)}>
            <ChevronLeft className="size-5" />
          </ArrowButton>
          <ArrowButton label="Suivant" disabled={active === count - 1} onClick={() => go(active + 1)}>
            <ChevronRight className="size-5" />
          </ArrowButton>
        </div>
      </div>

      {/* Scène 3D */}
      <div className="-mx-5 mt-2 py-6 [overflow-x:clip] sm:mx-0">
        <motion.div
          className="relative h-[230px] touch-pan-y select-none sm:h-[340px]"
          style={{ perspective: 1400 }}
          drag="x"
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.15}
          onDragEnd={onDragEnd}
        >
          {items.map(({ resource, state }, i) => {
            const offset = i - active;
            const abs = Math.abs(offset);
            if (abs > 3) return null;
            return (
              <motion.button
                key={resource.id}
                type="button"
                tabIndex={offset === 0 ? -1 : 0}
                aria-label={offset === 0 ? resource.name : `Voir ${resource.name}`}
                onClick={() => offset !== 0 && go(i)}
                className="absolute top-0 left-1/2 h-full w-[78%] max-w-[560px] origin-center cursor-pointer outline-none sm:w-[56%]"
                style={{ zIndex: 10 - abs, transformStyle: "preserve-3d" }}
                initial={false}
                animate={{
                  x: `calc(-50% + ${offset * 62}%)`,
                  rotateY: offset === 0 ? 0 : offset > 0 ? -38 : 38,
                  z: -abs * 160,
                  scale: offset === 0 ? 1 : 0.9,
                  opacity: abs > 2 ? 0 : offset === 0 ? 1 : 0.55 - (abs - 1) * 0.2,
                }}
                transition={{ type: "spring", stiffness: 220, damping: 28 }}
              >
                <div
                  className={cn(
                    "relative h-full overflow-hidden rounded-[2rem] border transition-shadow",
                    offset === 0 ? "border-brand-500/40 shadow-[0_40px_80px_-40px_rgb(0_0_0/0.7),0_0_0_1px_var(--line)]" : "border-line",
                  )}
                >
                  <ResourceArt resource={resource} className="size-full" />
                  <span className="absolute top-4 left-4">
                    <Status state={state} feminine={resource.kind === "room"} />
                  </span>
                  {offset !== 0 && (
                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-5 pt-10 pb-4 text-left font-display text-lg text-white">
                      {resource.name}
                    </span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </motion.div>
      </div>

      {/* Points de navigation */}
      <div className="mt-2 flex justify-center gap-1.5">
        {items.map(({ resource }, i) => (
          <button
            key={resource.id}
            type="button"
            aria-label={resource.name}
            onClick={() => go(i)}
            className={cn(
              "h-1.5 rounded-full transition-all",
              i === active ? "w-8 bg-brand-500" : "w-1.5 bg-stone-400/40 hover:bg-stone-400",
            )}
          />
        ))}
      </div>

      <Details item={current} busy={busyOf(current.resource.id)} start={start} end={end} past={past} onBook={onBook} />
    </div>
  );
}

function Details({
  item: { resource, state },
  busy,
  start,
  end,
  past,
  onBook,
}: {
  item: CarouselItem;
  busy: BusySlot[] | undefined;
  start: Date;
  end: Date;
  past: boolean;
  onBook: (resource: Resource, at?: Date) => void;
}) {
  const free = state.status === "free";
  const sameDay = isSameDay(start, new Date(end.getTime() - 1));
  const meta = resource.kind === "room" ? [resource.building, resource.floor] : [resource.model, resource.plate];
  const capacity = resource.capacity !== undefined ? `${resource.capacity} ${resource.kind === "room" ? "personnes" : "places"}` : null;

  return (
    <motion.section
      key={resource.id}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.2, 0.8, 0.2, 1] }}
      className="mx-auto mt-10 max-w-3xl rounded-[2rem] border border-line bg-surface p-7 sm:p-10"
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display text-4xl font-medium tracking-tight sm:text-5xl">{resource.name}</h3>
          <p className="mt-3 text-base text-muted">{[...meta].filter(Boolean).join(" · ")}</p>
          {resource.description && <p className="mt-1 text-sm text-muted">{resource.description}</p>}
        </div>
        {state.status === "busy" ? (
          <Button
            size="lg"
            variant="secondary"
            disabled={!state.nextFree || past}
            onClick={() => state.nextFree && onBook(resource, state.nextFree)}
          >
            {state.nextFree ? `Réserver à ${fmtTime(state.nextFree)}` : "Complet"}
          </Button>
        ) : (
          <Button size="lg" disabled={!free || past} onClick={() => onBook(resource)}>
            {past ? "Créneau passé" : "Réserver"}
          </Button>
        )}
      </div>

      <div className="mt-7 flex flex-wrap gap-2">
        {capacity && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3.5 py-1.5 text-sm font-medium text-brand-700">
            <Users className="size-3.5" /> {capacity}
          </span>
        )}
        {resource.features.map((f) => {
          const Icon = FEATURES[f].icon;
          return (
            <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-line px-3.5 py-1.5 text-sm text-muted">
              {Icon && <Icon className="size-3.5" />} {FEATURES[f].label}
            </span>
          );
        })}
      </div>

      {sameDay && (
        <div className="mt-8">
          <DayTimeline day={startOfDay(start)} busy={busy} selection={{ start, end, ok: free && !past }} />
        </div>
      )}
    </motion.section>
  );
}

/** Menu déroulant : accès direct à une salle ou un véhicule. */
function Picker({ items, active, onPick }: { items: CarouselItem[]; active: number; onPick: (i: number) => void }) {
  const current = items[active];
  const KindIcon = current.resource.kind === "room" ? DoorOpen : CarFront;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          type="button"
          className="flex h-14 min-w-0 items-center gap-3 rounded-full border border-line bg-surface py-2 pr-5 pl-2 text-left transition-colors hover:border-brand-500/50"
        >
          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-brand-700">
            <KindIcon className="size-5" />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">
              {current.resource.kind === "room" ? "Choisir une salle" : "Choisir un véhicule"}
            </span>
            <span className="block truncate font-semibold">{current.resource.name}</span>
          </span>
          <ChevronDown className="ml-2 size-4 shrink-0 text-muted" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="start"
          sideOffset={8}
          collisionPadding={12}
          className="data-[state=open]:animate-pop scrollbar-thin z-50 max-h-[min(420px,var(--radix-dropdown-menu-content-available-height))] w-[min(360px,calc(100vw-24px))] overflow-y-auto rounded-3xl border border-line bg-surface p-2 shadow-2xl"
        >
          {items.map(({ resource, state }, i) => (
            <DropdownMenu.Item
              key={resource.id}
              onSelect={() => onPick(i)}
              className="flex cursor-pointer items-center gap-3 rounded-2xl px-3 py-2.5 outline-none data-[highlighted]:bg-surface-2"
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  state.status === "free" ? "bg-emerald-500" : state.status === "busy" ? "bg-amber-500" : "bg-stone-400",
                )}
              />
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-sm font-medium">{resource.name}</span>
                <span className="block truncate text-xs text-muted">
                  {[
                    resource.kind === "room" ? resource.floor : resource.model,
                    resource.capacity && `${resource.capacity} ${resource.kind === "room" ? "pers." : "places"}`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              {i === active && <Check className="size-4 text-brand-600" />}
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

function ArrowButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="grid size-12 place-items-center rounded-full border border-line bg-surface transition-colors hover:border-brand-500 hover:text-brand-600 disabled:opacity-30"
    >
      {children}
    </button>
  );
}
