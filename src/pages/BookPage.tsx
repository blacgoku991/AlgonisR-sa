import { addMinutes } from "date-fns";
import { CalendarSearch, RotateCcw, Search, TriangleAlert, X } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ResourceCard, ResourceCardSkeleton } from "../components/ResourceCard";
import { SearchPanel } from "../components/SearchPanel";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { config } from "../config";
import { availabilityWindow, useAvailability, useMe, useResources } from "../hooks/queries";
import { matchesFilters, rankResources, resourceState } from "../lib/availability";
import { KIND_LABEL } from "../lib/features";
import { fmtDuration, fmtLongDate, fmtTime, isSameDay, startOfDay } from "../lib/time";
import { useBooking, useSlot } from "../store";

export function BookPage() {
  const kind = useBooking((s) => s.kind);
  const { data: me } = useMe();
  const { data: resources } = useResources(kind);

  return (
    <>
      <PageHeader
        title="Réserver"
        subtitle={`${me ? `Bonjour ${me.givenName ?? me.name.split(" ")[0]}. ` : ""}Choisissez un créneau, puis ${kind === "room" ? "une salle" : "un véhicule"} disponible.`}
      />
      <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <div className="min-w-0 lg:sticky lg:top-6">
          <SearchPanel resources={resources} />
        </div>
        <Results />
      </div>
    </>
  );
}

function Results() {
  const kind = useBooking((s) => s.kind);
  const people = useBooking((s) => s.people);
  const features = useBooking((s) => s.features);
  const building = useBooking((s) => s.building);
  const query = useBooking((s) => s.query);
  const setQuery = useBooking((s) => s.setQuery);
  const open = useBooking((s) => s.open);
  const { start, end } = useSlot();
  const [onlyFree, setOnlyFree] = useState(false);

  const { data: resources, isLoading, error } = useResources(kind);
  const { from, to } = availabilityWindow(start, end);
  const { data: availability, error: availabilityError, refetch } = useAvailability(kind, resources, from, to);

  const past = start < addMinutes(new Date(), -5);
  const searchLimit = isSameDay(start, end) ? addMinutes(startOfDay(start), config.dayEndHour * 60) : to;

  const ranked = useMemo(() => {
    if (!resources) return [];
    const filtered = resources.filter((r) => matchesFilters(r, { people, features, building, query }));
    return rankResources(
      filtered.map((resource) => ({ resource, state: resourceState(availability?.[resource.id], start, end, searchLimit) })),
      people,
    );
  }, [resources, availability, people, features, building, query, start, end, searchLimit]);

  const items = onlyFree ? ranked.filter((i) => i.state.status === "free") : ranked;
  const freeCount = ranked.filter((i) => i.state.status === "free").length;
  const label = KIND_LABEL[kind];
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

  if (error) return <ErrorState message={error instanceof Error ? error.message : String(error)} />;

  return (
    <section className="min-w-0 space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-sm font-medium">
            {availability ? (
              <>
                {freeCount} {freeCount > 1 ? label.many : label.one} disponible{freeCount > 1 ? "s" : ""}
                <span className="font-normal text-zinc-500"> sur {ranked.length}</span>
              </>
            ) : (
              <span className="text-zinc-500">Recherche des disponibilités…</span>
            )}
          </h2>
          <p className="text-xs text-zinc-500 tabular-nums">
            {fmtLongDate(start)} · {fmtTime(start)} – {fmtTime(end)} · {fmtDuration(minutes)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-zinc-600 select-none dark:text-zinc-400">
            <input
              type="checkbox"
              checked={onlyFree}
              onChange={(e) => setOnlyFree(e.target.checked)}
              className="size-3.5 accent-brand-600"
            />
            Disponibles uniquement
          </label>
          <div className="relative w-full sm:w-52">
            <Search className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-zinc-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={kind === "room" ? "Rechercher une salle" : "Modèle, plaque…"}
              aria-label="Rechercher"
              className="h-8 w-full rounded-md border border-zinc-200 bg-white pr-7 pl-8 text-sm outline-none placeholder:text-zinc-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-zinc-900"
            />
            {query && (
              <button
                onClick={() => setQuery("")}
                className="absolute top-1/2 right-1.5 -translate-y-1/2 p-1 text-zinc-400 hover:text-zinc-700"
                aria-label="Effacer"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {availabilityError && (
        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-800 dark:text-amber-200">
          <TriangleAlert className="size-4 shrink-0" />
          Impossible de lire les disponibilités pour le moment.
          <Button variant="ghost" size="sm" className="ml-auto" icon={<RotateCcw />} onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="card divide-y divide-zinc-200 overflow-hidden dark:divide-white/[0.06]">
          {Array.from({ length: 5 }, (_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          noResources={!resources || resources.length === 0}
          onlyFree={onlyFree && ranked.length > 0}
          kind={kind}
          onReset={() => {
            setOnlyFree(false);
            useBooking.setState({ people: 1, features: [], building: null, query: "" });
          }}
        />
      ) : (
        <LayoutGroup>
          <motion.div layout className="card divide-y divide-zinc-200 overflow-hidden dark:divide-white/[0.06]">
            <AnimatePresence initial={false} mode="popLayout">
              {items.map(({ resource, state }, index) => (
                <ResourceCard
                  key={resource.id}
                  index={index}
                  resource={resource}
                  state={state}
                  busy={availability?.[resource.id]?.busy}
                  start={start}
                  end={end}
                  past={past}
                  onBook={(at) => {
                    const s = at ?? start;
                    open({ resource, start: s, end: new Date(s.getTime() + (end.getTime() - start.getTime())) });
                  }}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        </LayoutGroup>
      )}
    </section>
  );
}

function EmptyState({
  noResources,
  onlyFree,
  kind,
  onReset,
}: {
  noResources: boolean;
  onlyFree: boolean;
  kind: "room" | "vehicle";
  onReset: () => void;
}) {
  const label = KIND_LABEL[kind];
  const fem = kind === "room" ? "e" : "";
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <CalendarSearch className="size-6 text-zinc-400" strokeWidth={1.5} />
      {noResources ? (
        <>
          <h3 className="mt-3 font-medium">
            Aucun{fem} {label.one} configuré{fem}
          </h3>
          <p className="mt-1 max-w-md text-sm text-zinc-500">
            {kind === "room"
              ? "Les salles sont lues depuis Exchange (boîtes aux lettres de salle). Demandez à votre administrateur Microsoft 365 de les créer, ou déclarez-les dans catalog.json."
              : "Les véhicules sont des boîtes aux lettres « équipement » Exchange, déclarées dans catalog.json par votre administrateur."}
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-3 font-medium">
            {onlyFree ? `Aucun${fem} ${label.one} libre sur ce créneau` : `Aucun${fem} ${label.one} ne correspond à vos critères`}
          </h3>
          <p className="mt-1 text-sm text-zinc-500">
            {onlyFree ? "Essayez un autre horaire ou une autre durée." : "Essayez d'élargir votre recherche."}
          </p>
          <Button variant="secondary" size="sm" className="mt-4" icon={<RotateCcw />} onClick={onReset}>
            Réinitialiser
          </Button>
        </>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <TriangleAlert className="size-6 text-rose-500" strokeWidth={1.5} />
      <h3 className="mt-3 font-medium">Connexion à Microsoft 365 impossible</h3>
      <p className="mt-1 max-w-md text-sm text-zinc-500">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" icon={<RotateCcw />} onClick={() => window.location.reload()}>
        Recharger
      </Button>
    </div>
  );
}
