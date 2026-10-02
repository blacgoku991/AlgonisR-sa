import { addMinutes } from "date-fns";
import { CalendarSearch, RotateCcw, TriangleAlert } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo, useState } from "react";
import { ResourceCard, ResourceCardSkeleton } from "../components/ResourceCard";
import { KindToggle } from "../components/KindToggle";
import { FilterChips, SearchBar } from "../components/SearchBar";
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
  const setKind = useBooking((s) => s.setKind);
  const { data: me } = useMe();
  const { data: resources } = useResources(kind);
  const [onlyFree, setOnlyFree] = useState(false);

  return (
    <>
      <PageHeader
        eyebrow={me ? `Bonjour ${me.givenName ?? me.name.split(" ")[0]}` : undefined}
        title={kind === "room" ? "Réserver une salle." : "Réserver un véhicule."}
        subtitle="Choisissez un créneau : les disponibilités s'affichent en temps réel, l'invitation part dans Outlook et Teams."
        actions={<KindToggle value={kind} onChange={setKind} />}
      />
      <div className="space-y-5">
        <SearchBar />
        <FilterChips resources={resources} onlyFree={onlyFree} setOnlyFree={setOnlyFree} />
      </div>
      <Results onlyFree={onlyFree} resetOnlyFree={() => setOnlyFree(false)} />
    </>
  );
}

function Results({ onlyFree, resetOnlyFree }: { onlyFree: boolean; resetOnlyFree: () => void }) {
  const kind = useBooking((s) => s.kind);
  const people = useBooking((s) => s.people);
  const features = useBooking((s) => s.features);
  const building = useBooking((s) => s.building);
  const query = useBooking((s) => s.query);
  const open = useBooking((s) => s.open);
  const { start, end } = useSlot();

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
    <section className="mt-12 min-w-0 space-y-6">
      <div className="flex items-baseline justify-between gap-4 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {availability ? (
              <>
                {freeCount} {freeCount > 1 ? label.many : label.one} disponible{freeCount > 1 ? "s" : ""}
                <span className="font-normal text-muted"> sur {ranked.length}</span>
              </>
            ) : (
              <span className="text-muted">Recherche des disponibilités…</span>
            )}
          </h2>
          <p className="mt-0.5 text-sm text-muted tabular-nums">
            {fmtLongDate(start)} · {fmtTime(start)} – {fmtTime(end)} · {fmtDuration(minutes)}
          </p>
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
        <div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          noResources={!resources || resources.length === 0}
          onlyFree={onlyFree && ranked.length > 0}
          kind={kind}
          onReset={() => {
            resetOnlyFree();
            useBooking.setState({ people: 1, features: [], building: null, query: "" });
          }}
        />
      ) : (
        <LayoutGroup>
          <motion.div layout className="grid gap-x-6 gap-y-12 sm:grid-cols-2 xl:grid-cols-3">
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
    <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center">
      <CalendarSearch className="size-6 text-zinc-400" strokeWidth={1.5} />
      {noResources ? (
        <>
          <h3 className="mt-3 font-medium">
            Aucun{fem} {label.one} configuré{fem}
          </h3>
          <p className="mt-1 max-w-md text-sm text-muted">
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
          <p className="mt-1 text-sm text-muted">
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
    <div className="flex flex-col items-center rounded-3xl bg-surface px-6 py-16 text-center">
      <TriangleAlert className="size-6 text-rose-500" strokeWidth={1.5} />
      <h3 className="mt-3 font-medium">Connexion à Microsoft 365 impossible</h3>
      <p className="mt-1 max-w-md text-sm text-muted">{message}</p>
      <Button variant="secondary" size="sm" className="mt-4" icon={<RotateCcw />} onClick={() => window.location.reload()}>
        Recharger
      </Button>
    </div>
  );
}
