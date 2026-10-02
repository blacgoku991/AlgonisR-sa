import { Minus, Plus, Search, Users, X } from "lucide-react";
import { cn } from "../lib/cn";
import { FEATURES, FILTERABLE } from "../lib/features";
import { useBooking } from "../store";
import type { Resource, ResourceKind } from "../types";

export function FiltersBar({ kind, resources }: { kind: ResourceKind; resources: Resource[] }) {
  const people = useBooking((s) => s.people);
  const setPeople = useBooking((s) => s.setPeople);
  const features = useBooking((s) => s.features);
  const toggleFeature = useBooking((s) => s.toggleFeature);
  const building = useBooking((s) => s.building);
  const setBuilding = useBooking((s) => s.setBuilding);
  const query = useBooking((s) => s.query);
  const setQuery = useBooking((s) => s.setQuery);

  const buildings = [...new Set(resources.map((r) => r.building).filter((b): b is string => Boolean(b)))].sort();
  const available = FILTERABLE[kind].filter((f) => resources.some((r) => r.features.includes(f)));

  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
      {/* Mobile : une seule ligne défilante · Bureau : retour à la ligne */}
      <div className="scrollbar-none -mx-4 flex items-center gap-2 overflow-x-auto px-4 py-0.5 sm:contents [&>*]:shrink-0">
        <div className="flex h-10 items-center gap-1 rounded-2xl border border-slate-200 bg-white pr-1 pl-3 shadow-sm dark:border-white/10 dark:bg-white/5">
          <Users className="size-4 text-slate-400" />
          <span className="mr-1 text-[13px] font-medium text-slate-600 dark:text-slate-300">
            {kind === "room" ? "Personnes" : "Places"}
          </span>
          <button
            onClick={() => setPeople(people - 1)}
            disabled={people <= 1}
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-white/10"
            aria-label="Moins"
          >
            <Minus className="size-3.5" />
          </button>
          <span className="w-6 text-center text-sm font-bold tabular-nums" aria-live="polite">
            {people}
          </span>
          <button
            onClick={() => setPeople(people + 1)}
            className="flex size-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Plus"
          >
            <Plus className="size-3.5" />
          </button>
        </div>

        {available.map((f) => {
          const { icon: Icon, label } = FEATURES[f];
          const on = features.includes(f);
          return (
            <button
              key={f}
              onClick={() => toggleFeature(f)}
              aria-pressed={on}
              className={cn(
                "flex h-10 items-center gap-1.5 rounded-2xl border px-3.5 text-[13px] font-medium shadow-sm transition-all",
                on
                  ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:border-brand-400/50 dark:text-brand-200"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-300",
              )}
            >
              <Icon className="size-4" /> {label}
            </button>
          );
        })}

        {buildings.length > 1 && (
          <div className="flex h-10 items-center rounded-2xl border border-slate-200 bg-white p-1 shadow-sm dark:border-white/10 dark:bg-white/5">
            {[null, ...buildings].map((b) => (
              <button
                key={b ?? "all"}
                onClick={() => setBuilding(b)}
                className={cn(
                  "h-full rounded-xl px-3 text-[13px] font-medium transition-colors",
                  building === b
                    ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10",
                )}
              >
                {b ?? "Tous les sites"}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="relative w-full sm:ml-auto sm:w-56">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-slate-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={kind === "room" ? "Rechercher une salle" : "Modèle, immatriculation…"}
          className="h-10 w-full rounded-2xl border border-slate-200 bg-white pr-9 pl-10 text-sm shadow-sm outline-none placeholder:text-slate-400 focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/5"
          aria-label="Rechercher"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700"
            aria-label="Effacer"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
