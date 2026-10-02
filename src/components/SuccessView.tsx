import { Check, Copy, ExternalLink, Mail } from "lucide-react";
import { motion } from "motion/react";
import { toast } from "sonner";
import { config } from "../config";
import { fmtDuration, fmtLongDate, fmtTime } from "../lib/time";
import type { Booking, Resource } from "../types";
import { AvatarStack } from "./ui/Avatar";
import { Button } from "./ui/Button";
import { TeamsLogo } from "./ui/TeamsLogo";

export function SuccessView({ booking, resource, onClose }: { booking: Booking; resource: Resource; onClose: () => void }) {
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
    else toast("Mode démonstration", { description: "Avec Microsoft 365, ce bouton ouvre l'événement dans Outlook." });
  };

  const rows: [React.ReactNode, React.ReactNode][] = [
    ["Date", `${fmtLongDate(booking.start)}`],
    ["Horaire", `${fmtTime(booking.start)} – ${fmtTime(booking.end)} · ${fmtDuration(minutes)}`],
    [
      resource.kind === "room" ? "Salle" : "Véhicule",
      [resource.name, resource.kind === "room" ? resource.floor : resource.location].filter(Boolean).join(" · "),
    ],
  ];

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="border-b border-zinc-200 px-5 py-6 dark:border-white/[0.08]">
        <motion.span
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.2 }}
          className="flex size-9 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
        >
          <Check className="size-5" strokeWidth={2.5} />
        </motion.span>
        <h2 className="mt-4 text-lg font-semibold tracking-tight">Réservation confirmée</h2>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">{booking.subject}</p>
      </div>

      <div className="space-y-6 px-5 py-6">
        <dl className="divide-y divide-zinc-200 rounded-lg border border-zinc-200 text-sm dark:divide-white/[0.06] dark:border-white/[0.08]">
          {rows.map(([k, v]) => (
            <div key={String(k)} className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-zinc-500">{k}</dt>
              <dd className="text-right font-medium">{v}</dd>
            </div>
          ))}
          {booking.teamsJoinUrl && (
            <div className="flex justify-between gap-4 px-4 py-2.5">
              <dt className="text-zinc-500">Visio</dt>
              <dd className="flex items-center gap-1.5 font-medium">
                <TeamsLogo className="size-4" /> Réunion Teams
              </dd>
            </div>
          )}
        </dl>

        <div className="space-y-2 text-sm">
          <p className="flex items-start gap-2.5 text-zinc-600 dark:text-zinc-300">
            <Mail className="mt-0.5 size-4 shrink-0 text-zinc-500" />
            {invited > 0
              ? `Invitation envoyée dans la boîte Outlook de ${invited} personne${invited > 1 ? "s" : ""} ; elle apparaît aussi dans leur calendrier Teams.`
              : "L'événement est ajouté à votre calendrier Outlook et Teams."}
          </p>
          <p className="flex items-start gap-2.5 text-zinc-600 dark:text-zinc-300">
            <Check className="mt-0.5 size-4 shrink-0 text-zinc-500" />
            {resource.kind === "room" ? "La salle" : "Le véhicule"} confirme automatiquement la réservation.
          </p>
          {invited > 0 && (
            <div className="pt-2 pl-6.5">
              <AvatarStack people={booking.attendees} max={8} size={26} />
            </div>
          )}
        </div>
      </div>

      <div className="mt-auto grid gap-2 border-t border-zinc-200 px-5 py-4 sm:grid-cols-2 dark:border-white/[0.08]">
        <Button variant="secondary" icon={<ExternalLink />} onClick={openOutlook}>
          Ouvrir dans Outlook
        </Button>
        {booking.teamsJoinUrl ? (
          <Button variant="secondary" icon={<Copy />} onClick={copyTeams}>
            Copier le lien Teams
          </Button>
        ) : (
          <span className="hidden sm:block" />
        )}
        <Button className="sm:col-span-2" onClick={onClose}>
          Terminé
        </Button>
        {config.demo && (
          <p className="text-center text-xs text-zinc-500 sm:col-span-2">Mode démonstration — aucune invitation réelle n'a été envoyée.</p>
        )}
      </div>
    </div>
  );
}
