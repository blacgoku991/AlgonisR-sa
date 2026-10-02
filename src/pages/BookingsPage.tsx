import { CalendarCheck, CalendarPlus, CarFront, DoorOpen, ExternalLink, KeyRound, RefreshCw, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AlertDialog } from "radix-ui";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AvatarStack } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { TeamsLogo } from "../components/ui/TeamsLogo";
import { useCancelBooking, useMyBookings } from "../hooks/queries";
import { cn } from "../lib/cn";
import { dayKey, fmtCountdown, fmtDuration, fmtRelativeDay, fmtTime, parseDayKey } from "../lib/time";
import { navigate } from "../router";
import type { Booking, ResponseStatus } from "../types";

export function BookingsPage() {
  const { data, isLoading, refetch, isFetching } = useMyBookings();
  const [cancelling, setCancelling] = useState<Booking | null>(null);
  const now = new Date();

  const groups = useMemo(() => {
    const upcoming = (data ?? []).filter((b) => b.end > now);
    const map = new Map<string, Booking[]>();
    for (const b of upcoming) {
      const key = dayKey(b.start < now ? now : b.start);
      map.set(key, [...(map.get(key) ?? []), b]);
    }
    return [...map.entries()];
  }, [data]);

  const count = groups.reduce((n, [, list]) => n + list.length, 0);

  return (
    <>
      <PageHeader
        icon={CalendarCheck}
        title="Mes réservations"
        subtitle={count > 0 ? `${count} à venir · synchronisées avec Outlook et Teams` : "Synchronisées avec Outlook et Teams"}
        actions={
          <>
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={cn(isFetching && "animate-spin")} />}
              onClick={() => refetch()}
            >
              Actualiser
            </Button>
            <Button size="sm" icon={<CalendarPlus />} onClick={() => navigate("book")}>
              Nouvelle réservation
            </Button>
          </>
        }
      />

      {isLoading ? (
        <div className="card space-y-3 p-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-14" />
          ))}
        </div>
      ) : count === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-8">
          {groups.map(([key, list]) => (
            <section key={key}>
              <h2 className="mb-2 text-sm font-medium">
                {fmtRelativeDay(parseDayKey(key))} <span className="font-normal text-muted">· {list.length}</span>
              </h2>
              <div className="card divide-y divide-[var(--line)] overflow-hidden dark:divide-white/[0.06]">
                <AnimatePresence initial={false}>
                  {list.map((b) => (
                    <BookingRow key={b.id} booking={b} onCancel={() => setCancelling(b)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <CancelDialog booking={cancelling} onClose={() => setCancelling(null)} />
    </>
  );
}

const RESOURCE_STATUS: Record<ResponseStatus, { label: string; dot: string }> = {
  accepted: { label: "Confirmée", dot: "bg-emerald-500" },
  organizer: { label: "Confirmée", dot: "bg-emerald-500" },
  tentativelyAccepted: { label: "Provisoire", dot: "bg-amber-500" },
  declined: { label: "Refusée", dot: "bg-rose-500" },
  none: { label: "En attente", dot: "bg-slate-400" },
  notResponded: { label: "En attente", dot: "bg-slate-400" },
};

function BookingRow({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const now = new Date();
  const live = now >= booking.start && now < booking.end;
  const countdown = fmtCountdown(booking.start, booking.end, now);
  const vehicle = booking.resource?.kind === "vehicle";
  const Icon = vehicle ? CarFront : DoorOpen;
  const status = RESOURCE_STATUS[booking.resourceStatus];
  const minutes = Math.round((booking.end.getTime() - booking.start.getTime()) / 60000);
  const accepted = booking.attendees.filter((a) => a.status === "accepted").length;

  return (
    <motion.article
      layout="position"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, height: 0 }}
      className="grid gap-x-6 gap-y-3 px-4 py-4 sm:px-5 lg:grid-cols-[110px_minmax(0,1fr)_auto] lg:items-center"
    >
      <div className="tabular-nums">
        <p className="text-sm font-medium">
          {fmtTime(booking.start)} – {fmtTime(booking.end)}
        </p>
        <p className={cn("text-xs", live ? "font-medium text-emerald-600 dark:text-emerald-400" : "text-muted")}>
          {countdown ?? fmtDuration(minutes)}
        </p>
      </div>

      <div className="min-w-0">
        <h3 className="truncate text-sm font-medium">{booking.subject}</h3>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
          <span className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300">
            <Icon className="size-3.5" strokeWidth={1.75} /> {booking.resourceName}
          </span>
          <span className="flex items-center gap-1.5">
            <span className={cn("size-1.5 rounded-full", status.dot)} /> {status.label}
          </span>
          {booking.teamsJoinUrl && (
            <span className="flex items-center gap-1">
              <TeamsLogo className="size-3.5" /> Teams
            </span>
          )}
          {booking.attendees.length > 0 && (
            <span className="flex items-center gap-1.5">
              <AvatarStack people={booking.attendees} max={4} size={18} />
              {booking.attendees.length} invité{booking.attendees.length > 1 ? "s" : ""}
              {accepted > 0 && ` · ${accepted} ✓`}
            </span>
          )}
        </div>
        {vehicle && (
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-muted">
            <KeyRound className="size-3.5" /> Clés à retirer à l'accueil
            {booking.resource?.location ? ` · véhicule : ${booking.resource.location}` : ""}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {booking.teamsJoinUrl && (
          <a
            href={booking.teamsJoinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-teams px-3 text-[13px] font-medium text-white transition hover:brightness-110"
          >
            Rejoindre
          </a>
        )}
        {booking.webLink && (
          <a
            href={booking.webLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-8 items-center gap-1.5 rounded-md border border-line px-3 text-[13px] font-medium transition hover:bg-surface"
          >
            <ExternalLink className="size-3.5" /> Outlook
          </a>
        )}
        <Button variant="ghost" size="sm" className="text-muted hover:text-rose-600 dark:hover:text-rose-400" onClick={onCancel}>
          Annuler
        </Button>
      </div>
    </motion.article>
  );
}

function CancelDialog({ booking, onClose }: { booking: Booking | null; onClose: () => void }) {
  const [comment, setComment] = useState("");
  const cancel = useCancelBooking();

  const confirm = async () => {
    if (!booking) return;
    try {
      await cancel.mutateAsync({ booking, comment: comment.trim() || undefined });
      toast.success("Réservation annulée", {
        description: booking.attendees.length
          ? "Les participants ont reçu une notification d'annulation."
          : `${booking.resourceName} est de nouveau disponible.`,
      });
      setComment("");
      onClose();
    } catch (error) {
      toast.error("Annulation impossible", { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <AlertDialog.Root open={Boolean(booking)} onOpenChange={(o) => !o && onClose()}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm" />
        <AlertDialog.Content className="data-[state=open]:animate-pop fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-line bg-[var(--bg)] p-6 shadow-2xl">
          <span className="flex size-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
            <Trash className="size-6" />
          </span>
          <AlertDialog.Title className="mt-4 text-lg font-semibold">Annuler cette réservation ?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-muted">
            « {booking?.subject} » — {booking && fmtRelativeDay(booking.start).toLowerCase()} à {booking && fmtTime(booking.start)}.{" "}
            {booking &&
              `${booking.resourceName} sera libéré${booking.resource?.kind === "room" ? "e" : ""}${booking.attendees.length ? " et les participants seront prévenus" : ""}.`}
          </AlertDialog.Description>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Message facultatif (ex. réunion reportée à jeudi)"
            className="mt-4 w-full resize-none rounded-lg border border-line bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-slate-400"
          />
          <div className="mt-5 flex justify-end gap-2">
            <AlertDialog.Cancel asChild>
              <Button variant="secondary">Conserver</Button>
            </AlertDialog.Cancel>
            <Button variant="danger" loading={cancel.isPending} onClick={confirm}>
              Annuler la réservation
            </Button>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

function Empty() {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      <CalendarPlus className="size-6 text-slate-400" strokeWidth={1.5} />
      <h3 className="mt-3 font-medium">Aucune réservation à venir</h3>
      <p className="mt-1 max-w-sm text-sm text-muted">Vos réservations de salles et de véhicules apparaîtront ici.</p>
      <Button className="mt-5" size="sm" icon={<CalendarPlus />} onClick={() => navigate("book")}>
        Nouvelle réservation
      </Button>
    </div>
  );
}
