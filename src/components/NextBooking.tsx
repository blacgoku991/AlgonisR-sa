import { ArrowRight, CarFront, DoorOpen } from "lucide-react";
import { motion } from "motion/react";
import { useMyBookings } from "../hooks/queries";
import { fmtCountdown, fmtRelativeDay, fmtTime } from "../lib/time";
import { navigate } from "../router";
import { TeamsLogo } from "./ui/TeamsLogo";

/** Rappel compact de la prochaine réservation (ou de celle en cours). */
export function NextBooking() {
  const { data } = useMyBookings();
  const now = new Date();
  const next = data?.find((b) => b.end > now);
  if (!next) return null;

  const countdown = fmtCountdown(next.start, next.end, now);
  const live = now >= next.start;
  const soon = next.start.getTime() - now.getTime() < 15 * 60000;
  const Icon = next.resource?.kind === "vehicle" ? CarFront : DoorOpen;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="card flex w-full items-center gap-3 p-3 pr-4 sm:w-auto sm:max-w-sm"
    >
      <span className="relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-brand-500/10 text-brand-600 dark:text-brand-300">
        <Icon className="size-5" />
        {live && (
          <span className="animate-pulse-ring absolute -top-0.5 -right-0.5 size-3 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900" />
        )}
      </span>
      <button onClick={() => navigate("bookings")} className="min-w-0 flex-1 text-left">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">
          {live ? "En cours" : "Prochaine réservation"}
          {countdown && !live && <span className="ml-1.5 text-brand-600 normal-case dark:text-brand-300">· {countdown.toLowerCase()}</span>}
        </p>
        <p className="truncate text-sm font-semibold">{next.subject}</p>
        <p className="truncate text-xs text-slate-500 dark:text-slate-400">
          {fmtRelativeDay(next.start)} · {fmtTime(next.start)} – {fmtTime(next.end)} · {next.resourceName}
        </p>
      </button>
      {next.teamsJoinUrl && (live || soon) ? (
        <a
          href={next.teamsJoinUrl}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-xl bg-teams px-3 py-2 text-xs font-semibold text-white hover:brightness-110"
        >
          <TeamsLogo className="size-4" /> Rejoindre
        </a>
      ) : (
        <ArrowRight className="size-4 shrink-0 text-slate-400" />
      )}
    </motion.div>
  );
}
