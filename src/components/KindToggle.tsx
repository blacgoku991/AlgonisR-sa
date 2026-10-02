import { CarFront, DoorOpen } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "../lib/cn";
import type { ResourceKind } from "../types";

const OPTIONS: { kind: ResourceKind; label: string; short: string; icon: typeof DoorOpen }[] = [
  { kind: "room", label: "Salles de réunion", short: "Salles", icon: DoorOpen },
  { kind: "vehicle", label: "Véhicules", short: "Véhicules", icon: CarFront },
];

export function KindToggle({
  value,
  onChange,
  id = "kind",
  compact,
}: {
  value: ResourceKind;
  onChange: (k: ResourceKind) => void;
  id?: string;
  compact?: boolean;
}) {
  return (
    <div
      role="tablist"
      aria-label="Type de ressource"
      className="inline-flex rounded-lg border border-zinc-200/80 bg-white/70 p-1 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5"
    >
      {OPTIONS.map(({ kind, label, short, icon: Icon }) => {
        const active = value === kind;
        return (
          <button
            key={kind}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(kind)}
            className={cn(
              "relative flex items-center gap-2 rounded-md font-semibold transition-colors",
              compact ? "h-9 px-3.5 text-[13px]" : "h-11 px-4 text-sm sm:px-5",
              active
                ? "text-white dark:text-zinc-900"
                : "text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white",
            )}
          >
            {active && (
              <motion.span
                layoutId={`${id}-pill`}
                className="bg-zinc-900 dark:bg-white absolute inset-0 rounded-md"
                transition={{ type: "spring", damping: 30, stiffness: 400 }}
              />
            )}
            <Icon className="relative size-4" />
            <span className="relative">
              {compact ? (
                short
              ) : (
                <>
                  <span className="sm:hidden">{short}</span>
                  <span className="hidden sm:inline">{label}</span>
                </>
              )}
            </span>
          </button>
        );
      })}
    </div>
  );
}
