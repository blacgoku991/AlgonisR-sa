import { addMinutes } from "date-fns";
import { CalendarSearch, RotateCcw, TriangleAlert } from "lucide-react";
import { AnimatePresence, LayoutGroup, motion } from "motion/react";
import { useMemo } from "react";
import { FiltersBar } from "../components/FiltersBar";
import { KindToggle } from "../components/KindToggle";
import { NextBooking } from "../components/NextBooking";
import { ResourceCard, ResourceCardSkeleton } from "../components/ResourceCard";
import { Button } from "../components/ui/Button";
import { WhenPicker } from "../components/WhenPicker";
import { config } from "../config";
import { availabilityWindow, useAvailability, useMe, useResources } from "../hooks/queries";
import { matchesFilters, rankResources, resourceState } from "../lib/availability";
import { KIND_LABEL } from "../lib/features";
import { fmtDuration, fmtLongDate, fmtTime, isSameDay, startOfDay } from "../lib/time";
import { useBooking, useSlot } from "../store";

function greeting(now = new Date()): string {
  const h = now.getHours();
  if (h < 5 || h >= 18) return "Bonsoir";
  return "Bonjour";
}

export function BookPage() {
  const kind = useBooking((s) => s.kind);
  const setKind = useBooking((s) => s.setKind);
  const { data: me } = useMe();

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl font-bold tracking-tight sm:text-4xl"
          >
            {greeting()}
            {me?.givenName || me?.name ? `, ${me.givenName ?? me.name.split(" ")[0]}` : ""}{" "}
            <span className="inline-block origin-[70%_70%] animate-[wave_1.8s_ease-in-out_1]">👋</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-1.5 text-slate-500 dark:text-slate-400"
          >
            Que souhaitez-vous <span className="text-gradient font-semibold">réserver</span> aujourd'hui ?
          </motion.p>
          <div className="mt-5">
            <KindToggle value={kind} onChange={setKind} />
          </div>
        </div>
        <NextBooking />
      </header>

      <section className="card p-4 sm:p-5">
        <WhenPicker kind={kind} />
      </section>

      <Results />
    </div>
  );
}

function Results() {
  const kind = useBooking((s) => s.kind);
  const people = useBooking((s) => s.people);
  const features = useBooking((s) => s.features);
  const building = useBooking((s) => s.building);
  const query = useBooking((s) => s.query);
  const open = useBooking((s) => s.open);
  const setPeople = useBooking((s) => s.setPeople);
  const { start, end } = useSlot();

  const { data: resources, isLoading, error } = useResources(kind);
  const { from, to } = availabilityWindow(start, end);
  const { data: availability, error: availabilityError, refetch } = useAvailability(kind, resources, from, to);

  const past = start < addMinutes(new Date(), -5);
  const searchLimit = isSameDay(start, end) ? addMinutes(startOfDay(start), config.dayEndHour * 60) : to;

  const items = useMemo(() => {
    if (!resources) return [];
    const filtered = resources.filter((r) => matchesFilters(r, { people, features, building, query }));
    const withState = filtered.map((resource) => ({
      resource,
      state: resourceState(availability?.[resource.id], start, end, searchLimit),
    }));
    return rankResources(withState, people);
  }, [resources, availability, people, features, building, query, start, end, searchLimit]);

  const freeCount = items.filter((i) => i.state.status === "free").length;
  const label = KIND_LABEL[kind];
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);

  if (error) {
    return <ErrorState message={error instanceof Error ? error.message : String(error)} />;
  }

  return (
    <section className="space-y-4">
      {resources && resources.length > 0 && <FiltersBar kind={kind} resources={resources} />}

      <div className="flex flex-wrap items-baseline justify-between gap-2 px-1">
        <h2 className="text-lg font-semibold tracking-tight">
          {availability ? (
            <>
              <span className="text-gradient">{freeCount}</span> {freeCount > 1 ? label.many : label.one} disponible
              {freeCount > 1 ? "s" : ""}
              <span className="font-normal text-slate-400"> sur {items.length}</span>
            </>
          ) : (
            <span className="text-slate-400">Recherche des disponibilités…</span>
          )}
        </h2>
        <p className="text-sm text-slate-500 tabular-nums dark:text-slate-400">
          {fmtLongDate(start)} · {fmtTime(start)} – {fmtTime(end)} · {fmtDuration(minutes)}
        </p>
      </div>

      {availabilityError && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
          <TriangleAlert className="size-4 shrink-0" />
          Impossible de lire les disponibilités pour le moment.
          <Button variant="ghost" size="sm" className="ml-auto" icon={<RotateCcw />} onClick={() => refetch()}>
            Réessayer
          </Button>
        </div>
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <ResourceCardSkeleton key={i} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          noResources={!resources || resources.length === 0}
          kind={kind}
          onReset={() => {
            setPeople(1);
            useBooking.setState({ features: [], building: null, query: "" });
          }}
        />
      ) : (
        <LayoutGroup>
          <motion.div layout className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <AnimatePresence mode="popLayout">
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

function EmptyState({ noResources, kind, onReset }: { noResources: boolean; kind: "room" | "vehicle"; onReset: () => void }) {
  const label = KIND_LABEL[kind];
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
        <CalendarSearch className="size-7" />
      </span>
      {noResources ? (
        <>
          <h3 className="mt-4 text-lg font-semibold">
            Aucun{kind === "room" ? "e" : ""} {label.one} configuré{kind === "room" ? "e" : ""}
          </h3>
          <p className="mt-1 max-w-md text-sm text-slate-500">
            {kind === "room"
              ? "Les salles sont lues depuis Exchange (boîtes aux lettres de salle). Demandez à votre administrateur Microsoft 365 de les créer, ou déclarez-les dans catalog.json."
              : "Les véhicules sont des boîtes aux lettres « équipement » Exchange, déclarées dans catalog.json par votre administrateur."}
          </p>
        </>
      ) : (
        <>
          <h3 className="mt-4 text-lg font-semibold">
            Aucun{kind === "room" ? "e" : ""} {label.one} ne correspond à vos critères
          </h3>
          <p className="mt-1 text-sm text-slate-500">Essayez d'élargir votre recherche.</p>
          <Button variant="soft" className="mt-5" icon={<RotateCcw />} onClick={onReset}>
            Réinitialiser les filtres
          </Button>
        </>
      )}
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
        <TriangleAlert className="size-7" />
      </span>
      <h3 className="mt-4 text-lg font-semibold">Connexion à Microsoft 365 impossible</h3>
      <p className="mt-1 max-w-md text-sm text-slate-500">{message}</p>
      <Button variant="soft" className="mt-5" icon={<RotateCcw />} onClick={() => window.location.reload()}>
        Recharger
      </Button>
    </div>
  );
}
