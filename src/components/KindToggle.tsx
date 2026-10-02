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
    <div className={cn("inline-flex rounded-full bg-surface p-1", className)} role="tablist" aria-label="Type de ressource">
      {(["room", "vehicle"] as const).map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "h-9 rounded-full px-5 text-sm font-medium transition-all",
            value === k
              ? "bg-[var(--bg)] text-zinc-950 shadow-sm dark:bg-zinc-800 dark:text-white"
              : "text-muted hover:text-zinc-950 dark:hover:text-white",
          )}
        >
          {k === "room" ? "Salles" : "Véhicules"}
        </button>
      ))}
    </div>
  );
}
