import { CarFront, DoorOpen } from "lucide-react";
import { cn } from "../lib/cn";
import type { ResourceKind } from "../types";

/** Sélecteur Salles / Véhicules. */
export function KindToggle({
  value,
  onChange,
  className,
}: {
  value: ResourceKind;
  onChange: (k: ResourceKind) => void;
  className?: string;
}) {
  return (
    <div className={cn("inline-flex shrink-0 self-start rounded-full bg-surface p-1.5 shadow-sm lg:self-auto", className)} role="tablist" aria-label="Type de ressource">
      {(["room", "vehicle"] as const).map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "flex h-11 items-center gap-2 rounded-full px-5 text-sm font-semibold transition-all",
            value === k
              ? "bg-brand-600 text-accent-fg"
              : "text-muted hover:text-slate-900 dark:hover:text-white",
          )}
        >
          {k === "room" ? <DoorOpen className="size-4" /> : <CarFront className="size-4" />}
          {k === "room" ? "Salles" : "Véhicules"}
        </button>
      ))}
    </div>
  );
}
