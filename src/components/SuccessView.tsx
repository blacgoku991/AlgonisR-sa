import confetti from "canvas-confetti";
import { CalendarCheck, Check, Copy, ExternalLink, MapPin } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { toast } from "sonner";
import { config } from "../config";
import { fmtDuration, fmtLongDate, fmtTime } from "../lib/time";
import type { Booking, Resource } from "../types";
import { AvatarStack } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { TeamsLogo } from "./ui/TeamsLogo";

export function SuccessView({ booking, resource, onClose }: { booking: Booking; resource: Resource; onClose: () => void }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const colors = ["#6366f1", "#a855f7", "#ec4899", "#22c55e", "#f59e0b"];
    const fire = (x: number, angle: number) =>
      confetti({ particleCount: 70, spread: 70, angle, origin: { x, y: 0.55 }, colors, zIndex: 9999, scalar: 0.9, ticks: 220 });
    const t = setTimeout(() => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      fire(desktop ? 0.72 : 0.25, 60);
      fire(desktop ? 0.95 : 0.75, 120);
    }, 250);
    return () => clearTimeout(t);
  }, []);

  const minutes = Math.round((booking.end.getTime() - booking.start.getTime()) / 60000);
  const invited = booking.attendees.length;

  const copyTeams = async () => {
    if (!booking.teamsJoinUrl) return;
    try {
      await navigator.clipboard.writeText(booking.teamsJoinUrl);
      toast.success("Lien Teams copié");
    } catch {
      toast.error("Impossible de copier le lien");
    }
  };

  const openOutlook = () => {
    if (booking.webLink) window.open(booking.webLink, "_blank", "noopener");
    else toast.info("Mode démo", { description: "Avec Microsoft 365, ce bouton ouvre l'événement dans Outlook." });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center overflow-y-auto px-6 py-10">
      <div className="flex flex-col items-center text-center">
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", damping: 12, stiffness: 200 }}
          className="relative"
        >
          <motion.span
            className="absolute inset-0 rounded-full bg-emerald-400/30"
            initial={{ scale: 1, opacity: 0.7 }}
            animate={{ scale: 1.9, opacity: 0 }}
            transition={{ duration: 1.2, repeat: 1, ease: "easeOut" }}
          />
          <span className="relative flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 text-white shadow-[0_18px_40px_-12px_rgb(16_185_129/0.7)]">
            <svg
              viewBox="0 0 24 24"
              className="size-10"
              fill="none"
              stroke="currentColor"
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <motion.path
                d="M5 12.5l4.5 4.5L19 7.5"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ delay: 0.25, duration: 0.45 }}
              />
            </svg>
          </span>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
          <h2 className="mt-6 text-3xl font-bold tracking-tight">C'est réservé !</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            {invited > 0
              ? `Les invitations sont parties dans la boîte Outlook de ${invited} personne${invited > 1 ? "s" : ""}.`
              : "L'événement a été ajouté à votre calendrier."}
          </p>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="mt-8 rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5 dark:border-white/10 dark:bg-white/[0.03]"
      >
        <p className="text-lg font-semibold">{booking.subject}</p>
        <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
          <p className="flex items-center gap-2.5">
            <CalendarCheck className="size-4 text-brand-500" />
            {fmtLongDate(booking.start)} · {fmtTime(booking.start)} – {fmtTime(booking.end)} ({fmtDuration(minutes)})
          </p>
          <p className="flex items-center gap-2.5">
            <MapPin className="size-4 text-brand-500" />
            {resource.name}
            {resource.kind === "room" && resource.floor ? ` · ${resource.floor}` : ""}
            {resource.kind === "vehicle" && resource.location ? ` · ${resource.location}` : ""}
          </p>
          {booking.teamsJoinUrl && (
            <p className="flex items-center gap-2.5">
              <TeamsLogo className="size-4" /> Réunion Teams incluse
            </p>
          )}
        </div>
        {invited > 0 && (
          <div className="mt-4 flex items-center gap-3 border-t border-slate-200/80 pt-4 dark:border-white/10">
            <AvatarStack people={booking.attendees} max={6} size={30} />
            <span className="text-xs text-slate-500">
              {invited} invité{invited > 1 ? "s" : ""}
            </span>
          </div>
        )}
        <div className="mt-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-700 dark:text-emerald-300">
          <Check className="size-4 shrink-0" />
          {resource.kind === "room" ? "La salle confirme" : "Le véhicule confirme"} automatiquement la réservation dans Exchange.
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="grid gap-2 pt-8 sm:grid-cols-2">
        <Button variant="secondary" icon={<ExternalLink />} onClick={openOutlook}>
          Ouvrir dans Outlook
        </Button>
        {booking.teamsJoinUrl ? (
          <Button variant="teams" icon={<Copy />} onClick={copyTeams}>
            Copier le lien Teams
          </Button>
        ) : (
          <Button variant="secondary" onClick={onClose}>
            Nouvelle réservation
          </Button>
        )}
        <Button className="sm:col-span-2" size="lg" onClick={onClose}>
          Terminé
        </Button>
        {config.demo && (
          <p className="text-center text-[11px] text-slate-400 sm:col-span-2">Mode démo — aucune invitation réelle n'a été envoyée.</p>
        )}
      </motion.div>
    </div>
  );
}
