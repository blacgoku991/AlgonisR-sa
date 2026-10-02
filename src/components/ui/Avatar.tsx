import { Users } from "lucide-react";
import { usePhoto } from "../../hooks/queries";
import { cn } from "../../lib/cn";
import type { PersonStatus } from "../../lib/availability";

const GRADIENTS = [
  "from-zinc-500 to-zinc-700",
  "from-zinc-600 to-zinc-800",
  "from-neutral-500 to-neutral-700",
  "from-stone-500 to-stone-700",
  "from-zinc-400 to-zinc-600",
  "from-neutral-600 to-neutral-800",
];

export function initials(name: string): string {
  const parts = name
    .replace(/[^\p{L}\s-]/gu, " ")
    .trim()
    .split(/\s+/);
  if (parts.length === 0 || !parts[0]) return "?";
  return ((parts[0][0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

function gradientFor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 33 + key.charCodeAt(i)) >>> 0;
  return GRADIENTS[h % GRADIENTS.length];
}

const STATUS_COLOR: Record<PersonStatus, string> = {
  free: "bg-emerald-500",
  busy: "bg-rose-500",
  tentative: "bg-amber-400",
  oof: "bg-fuchsia-500",
  unknown: "bg-zinc-300 dark:bg-zinc-600",
};

export const STATUS_LABEL: Record<PersonStatus, string> = {
  free: "Disponible",
  busy: "Occupé(e)",
  tentative: "Provisoire",
  oof: "Absent(e)",
  unknown: "Disponibilité inconnue",
};

interface AvatarProps {
  name: string;
  email?: string;
  size?: number;
  status?: PersonStatus;
  isGroup?: boolean;
  className?: string;
  /** Charger la photo Microsoft 365 (désactivé pour les adresses externes). */
  photo?: boolean;
}

export function Avatar({ name, email, size = 36, status, isGroup, className, photo = true }: AvatarProps) {
  const { data: src } = usePhoto(photo && email && !isGroup ? email : undefined);
  const dot = Math.max(8, Math.round(size * 0.3));
  return (
    <span className={cn("relative inline-flex shrink-0", className)} style={{ width: size, height: size }}>
      {src ? (
        <img src={src} alt="" className="size-full rounded-full object-cover ring-2 ring-white dark:ring-zinc-900" />
      ) : (
        <span
          aria-hidden
          className={cn(
            "flex size-full items-center justify-center rounded-full bg-gradient-to-br font-semibold text-white ring-2 ring-white dark:ring-zinc-900",
            gradientFor(email ?? name),
          )}
          style={{ fontSize: Math.max(10, size * 0.38) }}
        >
          {isGroup ? <Users style={{ width: size * 0.48, height: size * 0.48 }} /> : initials(name)}
        </span>
      )}
      {status && (
        <span
          title={STATUS_LABEL[status]}
          className={cn("absolute right-0 bottom-0 rounded-full ring-2 ring-white dark:ring-zinc-900", STATUS_COLOR[status])}
          style={{ width: dot, height: dot }}
        />
      )}
    </span>
  );
}

export function AvatarStack({ people, max = 4, size = 28 }: { people: { name: string; email: string }[]; max?: number; size?: number }) {
  const shown = people.slice(0, max);
  const rest = people.length - shown.length;
  return (
    <div className="flex items-center -space-x-2">
      {shown.map((p) => (
        <Avatar key={p.email} name={p.name} email={p.email} size={size} />
      ))}
      {rest > 0 && (
        <span
          className="relative flex items-center justify-center rounded-full bg-zinc-100 text-[11px] font-semibold text-zinc-600 ring-2 ring-white dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-900"
          style={{ width: size, height: size }}
        >
          +{rest}
        </span>
      )}
    </div>
  );
}
