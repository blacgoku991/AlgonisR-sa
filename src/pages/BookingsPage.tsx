import { CalendarPlus, CarFront, CircleCheck, CircleDashed, CircleX, Clock, DoorOpen, ExternalLink, RefreshCw, Trash } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { AlertDialog } from "radix-ui";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AvatarStack } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
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
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mes réservations</h1>
          <p className="mt-1 text-zinc-500 dark:text-zinc-400">
            {count > 0
              ? `${count} réservation${count > 1 ? "s" : ""} à venir · synchronisées avec Outlook et Teams`
              : "Synchronisées avec Outlook et Teams"}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" icon={<RefreshCw className={cn(isFetching && "animate-spin")} />} onClick={() => refetch()}>
            Actualiser
          </Button>
          <Button icon={<CalendarPlus />} onClick={() => navigate("book")}>
            Réserver
          </Button>
        </div>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="skeleton h-28 rounded-xl" />
          ))}
        </div>
      ) : count === 0 ? (
        <Empty />
      ) : (
        <div className="space-y-8">
          {groups.map(([key, list]) => (
            <section key={key}>
              <h2 className="sticky top-[72px] z-10 -mx-1 mb-3 flex items-center gap-2 px-1 py-1 text-sm font-semibold text-zinc-500 backdrop-blur dark:text-zinc-400">
                {fmtRelativeDay(parseDayKey(key))}
                <span className="rounded-full bg-zinc-200/70 px-2 text-[11px] text-zinc-600 dark:bg-white/10 dark:text-zinc-300">
                  {list.length}
                </span>
              </h2>
              <div className="space-y-3">
                <AnimatePresence initial={false}>
                  {list.map((b) => (
                    <BookingCard key={b.id} booking={b} onCancel={() => setCancelling(b)} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          ))}
        </div>
      )}

      <CancelDialog booking={cancelling} onClose={() => setCancelling(null)} />
    </div>
  );
}

const RESOURCE_STATUS: Record<ResponseStatus, { label: string; className: string; icon: typeof CircleCheck }> = {
  accepted: { label: "Confirmée", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CircleCheck },
  organizer: { label: "Confirmée", className: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300", icon: CircleCheck },
  tentativelyAccepted: { label: "Provisoire", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300", icon: CircleDashed },
  declined: { label: "Refusée", className: "bg-rose-500/10 text-rose-700 dark:text-rose-300", icon: CircleX },
  none: { label: "En attente", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300", icon: Clock },
  notResponded: { label: "En attente", className: "bg-zinc-500/10 text-zinc-600 dark:text-zinc-300", icon: Clock },
};

function BookingCard({ booking, onCancel }: { booking: Booking; onCancel: () => void }) {
  const now = new Date();
  const live = now >= booking.start && now < booking.end;
  const countdown = fmtCountdown(booking.start, booking.end, now);
  const vehicle = booking.resource?.kind === "vehicle";
  const Icon = vehicle ? CarFront : DoorOpen;
  const status = RESOURCE_STATUS[booking.resourceStatus];
  const hue = booking.resource?.hue ?? 250;
  const minutes = Math.round((booking.end.getTime() - booking.start.getTime()) / 60000);
  const accepted = booking.attendees.filter((a) => a.status === "accepted").length;

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -30, height: 0, marginTop: 0 }}
      className={cn(
        "card group relative flex flex-col gap-4 overflow-hidden p-4 sm:flex-row sm:items-center sm:p-5",
        live && "ring-2 ring-emerald-500/40",
      )}
    >
      <span
        className="absolute inset-y-0 left-0 w-1.5"
        style={{ background: `linear-gradient(to bottom, oklch(0.68 0.17 ${hue}), oklch(0.52 0.2 ${hue + 30}))` }}
      />

      <div className="flex items-center gap-4 sm:w-28 sm:flex-col sm:items-start sm:gap-0 sm:pl-2">
        <p className="text-lg font-medium tabular-nums">{fmtTime(booking.start)}</p>
        <p className="text-sm text-zinc-500 tabular-nums dark:text-zinc-400">
          {fmtTime(booking.end)} <span className="text-zinc-400">· {fmtDuration(minutes)}</span>
        </p>
        {countdown && (
          <span
            className={cn(
              "mt-1 rounded-full px-2 py-0.5 text-[11px] font-semibold",
              live ? "bg-emerald-500 text-white" : "bg-brand-500/10 text-brand-700 dark:text-brand-200",
            )}
          >
            {countdown}
          </span>
        )}
      </div>

      <div className="min-w-0 flex-1 sm:border-l sm:border-zinc-200/80 sm:pl-5 dark:sm:border-white/10">
        <h3 className="truncate text-base font-semibold">{booking.subject}</h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm text-zinc-600 dark:text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Icon className="size-4 text-zinc-400" /> {booking.resourceName}
          </span>
          <span className={cn("flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", status.className)}>
            <status.icon className="size-3" /> {status.label}
          </span>
          {booking.teamsJoinUrl && (
            <span className="flex items-center gap-1 text-xs text-zinc-500">
              <TeamsLogo className="size-4" /> Teams
            </span>
          )}
        </div>
        {booking.attendees.length > 0 && (
          <div className="mt-3 flex items-center gap-2.5">
            <AvatarStack people={booking.attendees} max={5} size={26} />
            <span className="text-xs text-zinc-500">
              {booking.attendees.length} invité{booking.attendees.length > 1 ? "s" : ""}
              {accepted > 0 && ` · ${accepted} accepté${accepted > 1 ? "s" : ""}`}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 sm:flex-col sm:items-stretch lg:flex-row lg:items-center">
        {booking.teamsJoinUrl && (
          <a
            href={booking.teamsJoinUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md bg-teams px-3.5 text-[13px] font-semibold text-white transition hover:brightness-110"
          >
            <TeamsLogo className="size-4" /> Rejoindre
          </a>
        )}
        {booking.webLink && (
          <a
            href={booking.webLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-3.5 text-[13px] font-semibold text-zinc-700 transition hover:bg-zinc-50 dark:border-white/10 dark:bg-white/5 dark:text-zinc-200"
          >
            <ExternalLink className="size-4" /> Outlook
          </a>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="h-9 text-rose-600 hover:bg-rose-500/10 hover:text-rose-700 dark:text-rose-400"
          icon={<Trash />}
          onClick={onCancel}
        >
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
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-zinc-950/40 backdrop-blur-sm" />
        <AlertDialog.Content className="data-[state=open]:animate-pop fixed top-1/2 left-1/2 z-50 w-[min(440px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-[#161618]">
          <span className="flex size-12 items-center justify-center rounded-lg bg-rose-500/10 text-rose-600">
            <Trash className="size-6" />
          </span>
          <AlertDialog.Title className="mt-4 text-lg font-semibold">Annuler cette réservation ?</AlertDialog.Title>
          <AlertDialog.Description className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            « {booking?.subject} » — {booking && fmtRelativeDay(booking.start).toLowerCase()} à {booking && fmtTime(booking.start)}.{" "}
            {booking &&
              `${booking.resourceName} sera libéré${booking.resource?.kind === "room" ? "e" : ""}${booking.attendees.length ? " et les participants seront prévenus" : ""}.`}
          </AlertDialog.Description>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder="Message facultatif (ex. réunion reportée à jeudi)"
            className="mt-4 w-full resize-none rounded-lg border border-zinc-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-brand-400 focus:ring-4 focus:ring-brand-500/15 dark:border-white/10 dark:bg-white/5"
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
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="relative">
        <span className="flex size-12 items-center justify-center rounded-lg border border-zinc-200 text-zinc-500 dark:border-white/[0.08]">
          <CalendarPlus className="size-5" />
        </span>
      </div>
      <h3 className="mt-5 text-base font-semibold">Aucune réservation à venir</h3>
      <p className="mt-1 max-w-sm text-sm text-zinc-500">
        Réservez une salle ou un véhicule en quelques secondes — vos invités le recevront directement dans Outlook et Teams.
      </p>
      <Button className="mt-6" size="lg" icon={<CalendarPlus />} onClick={() => navigate("book")}>
        Faire une réservation
      </Button>
    </div>
  );
}
