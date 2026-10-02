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
    <div
      className={cn("grid grid-cols-2 rounded-md bg-zinc-100 p-0.5 dark:bg-white/[0.05]", className)}
      role="tablist"
      aria-label="Type de ressource"
    >
      {(["room", "vehicle"] as const).map((k) => (
        <button
          key={k}
          role="tab"
          aria-selected={value === k}
          onClick={() => onChange(k)}
          className={cn(
            "h-8 rounded-[5px] px-4 text-[13px] font-medium transition-colors",
            value === k
              ? "bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-white"
              : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100",
          )}
        >
          {k === "room" ? "Salles" : "Véhicules"}
        </button>
      ))}
    </div>
  );
}
