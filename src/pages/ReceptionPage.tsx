import { addDays } from "date-fns";
import { ChevronLeft, ChevronRight, KeyRound, Lock, Mail, MessageSquare, RotateCcw, Undo2 } from "lucide-react";
import { Dialog } from "radix-ui";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar } from "../components/ui/Avatar";
import { Button } from "../components/ui/Button";
import { PageHeader } from "../components/ui/PageHeader";
import { useMe, useRole, useUpdateKeyLog, useVehicleBookings } from "../hooks/queries";
import { cn } from "../lib/cn";
import { keyStatus, type KeyStatus } from "../lib/rules";
import { dayKey, fmtLongDate, fmtTime, format, frLocale, isSameDay, parseDayKey, startOfDay } from "../lib/time";
import type { KeyLog, VehicleBooking } from "../types";

const STATUS: Record<KeyStatus, { label: string; dot: string; text: string }> = {
  upcoming: { label: "À venir", dot: "bg-zinc-400", text: "text-zinc-500" },
  toHand: { label: "À remettre", dot: "bg-brand-500", text: "text-brand-600 dark:text-brand-400" },
  out: { label: "Clés sorties", dot: "bg-amber-500", text: "text-amber-700 dark:text-amber-400" },
  overdue: { label: "Retour en retard", dot: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" },
  returned: { label: "Rendues", dot: "bg-emerald-500", text: "text-emerald-700 dark:text-emerald-400" },
  missed: { label: "Non retirées", dot: "bg-zinc-400", text: "text-zinc-500" },
};

type Action = { booking: VehicleBooking; kind: "hand" | "return" };

export function ReceptionPage() {
  const { data: role, isLoading: roleLoading } = useRole();
  const [day, setDay] = useState(dayKey(new Date()));
  const date = parseDayKey(day);
  const from = useMemo(() => addDays(startOfDay(date), -14), [day]);
  const to = useMemo(() => addDays(startOfDay(date), 1), [day]);
  const { data, isLoading, error, refetch, isFetching } = useVehicleBookings(from, to, Boolean(role?.reception));
  const [action, setAction] = useState<Action | null>(null);
  const now = new Date();
  const isToday = isSameDay(date, now);

  const groups = useMemo(() => {
    const list = (data ?? []).map((b) => ({ b, status: keyStatus(b, now) }));
    const onDay = (b: VehicleBooking) => isSameDay(b.start, date) || (b.start < date && b.end > date);
    return {
      overdue: list.filter((x) => x.status === "overdue"),
      toHand: list.filter((x) => (x.status === "toHand" || x.status === "upcoming") && onDay(x.b)),
      out: list.filter((x) => x.status === "out"),
      done: list.filter((x) => (x.status === "returned" || x.status === "missed") && onDay(x.b)),
    };
  }, [data, day]);

  if (roleLoading) return null;
  if (!role?.reception) {
    return (
      <div className="card mx-auto mt-10 flex max-w-md flex-col items-center px-6 py-12 text-center">
        <Lock className="size-6 text-zinc-400" strokeWidth={1.5} />
        <h1 className="mt-3 font-medium">Accès réservé à l'accueil</h1>
        <p className="mt-1 text-sm text-zinc-500">Cet espace est réservé aux personnes chargées de la remise des clés des véhicules.</p>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title="Accueil · clés des véhicules"
        subtitle="Remise et retour des clés. Mis à jour automatiquement toutes les 30 secondes."
        actions={
          <>
            <div className="flex items-center rounded-md border border-zinc-200 dark:border-white/10">
              <IconBtn label="Jour précédent" onClick={() => setDay(dayKey(addDays(date, -1)))}>
                <ChevronLeft className="size-4" />
              </IconBtn>
              <button
                onClick={() => setDay(dayKey(new Date()))}
                className="h-8 border-x border-zinc-200 px-3 text-[13px] capitalize dark:border-white/10"
              >
                {isToday ? "Aujourd'hui" : format(date, "EEE d MMM", { locale: frLocale })}
              </button>
              <IconBtn label="Jour suivant" onClick={() => setDay(dayKey(addDays(date, 1)))}>
                <ChevronRight className="size-4" />
              </IconBtn>
            </div>
            <Button
              variant="secondary"
              size="sm"
              icon={<RotateCcw className={cn(isFetching && "animate-spin")} />}
              onClick={() => refetch()}
            >
              Actualiser
            </Button>
          </>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-zinc-200 bg-zinc-200 sm:grid-cols-4 dark:border-white/[0.08] dark:bg-white/[0.08]">
        <Stat label="À remettre" value={groups.toHand.length} />
        <Stat label="Clés sorties" value={groups.out.length} />
        <Stat label="Retours en retard" value={groups.overdue.length} alert={groups.overdue.length > 0} />
        <Stat label="Terminées" value={groups.done.filter((x) => x.status === "returned").length} />
      </div>

      {error ? (
        <div className="card px-6 py-10 text-center text-sm text-zinc-500">{error instanceof Error ? error.message : String(error)}</div>
      ) : isLoading ? (
        <div className="card space-y-3 p-5">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="skeleton h-12" />
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {groups.overdue.length > 0 && (
            <Group title="Retours en retard" hint="Le véhicule aurait dû être rendu">
              {groups.overdue.map(({ b, status }) => (
                <Row key={b.id} booking={b} status={status} onAction={setAction} />
              ))}
            </Group>
          )}
          <Group title={`Départs · ${fmtLongDate(date)}`} hint="Clés à remettre au collaborateur" empty="Aucun départ prévu ce jour.">
            {groups.toHand.map(({ b, status }) => (
              <Row key={b.id} booking={b} status={status} onAction={setAction} />
            ))}
          </Group>
          <Group title="Clés sorties" hint="Véhicules en cours d'utilisation" empty="Aucune clé sortie.">
            {groups.out.map(({ b, status }) => (
              <Row key={b.id} booking={b} status={status} onAction={setAction} />
            ))}
          </Group>
          {groups.done.length > 0 && (
            <Group title="Terminées">
              {groups.done.map(({ b, status }) => (
                <Row key={b.id} booking={b} status={status} onAction={setAction} />
              ))}
            </Group>
          )}
        </div>
      )}

      <KeyDialog action={action} onClose={() => setAction(null)} />
    </>
  );
}

function Stat({ label, value, alert }: { label: string; value: number; alert?: boolean }) {
  return (
    <div className="bg-white px-4 py-3 dark:bg-[#131315]">
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn("mt-0.5 text-2xl font-semibold tabular-nums", alert && "text-rose-600 dark:text-rose-400")}>{value}</p>
    </div>
  );
}

function Group({
  title,
  hint,
  empty,
  children,
}: {
  title: string;
  hint?: string;
  empty?: string;
  children: React.ReactNode[] | React.ReactNode;
}) {
  const count = Array.isArray(children) ? children.length : children ? 1 : 0;
  return (
    <section>
      <div className="mb-2 flex items-baseline gap-2">
        <h2 className="text-sm font-medium">{title}</h2>
        {hint && <p className="text-xs text-zinc-500">{hint}</p>}
      </div>
      {count === 0 ? (
        <p className="rounded-lg border border-dashed border-zinc-200 px-4 py-5 text-center text-sm text-zinc-500 dark:border-white/10">
          {empty}
        </p>
      ) : (
        <div className="card divide-y divide-zinc-200 overflow-hidden dark:divide-white/[0.06]">{children}</div>
      )}
    </section>
  );
}

function Row({ booking: b, status, onAction }: { booking: VehicleBooking; status: KeyStatus; onAction: (a: Action) => void }) {
  const s = STATUS[status];
  const sameDay = isSameDay(b.start, b.end);
  const log = b.keyLog;
  const update = useUpdateKeyLog();

  const undo = async () => {
    const next: KeyLog = log.returnedAt ? { ...log, returnedAt: undefined, returnedBy: undefined, endKm: undefined } : {};
    await update.mutateAsync({ booking: b, log: next });
    toast("Action annulée");
  };

  return (
    <div className="grid gap-x-6 gap-y-3 px-4 py-3.5 sm:px-5 lg:grid-cols-[120px_minmax(0,1.2fr)_minmax(0,1fr)_auto] lg:items-center">
      <div className="text-sm tabular-nums">
        <p className="font-medium">
          {fmtTime(b.start)} – {sameDay ? fmtTime(b.end) : format(b.end, "dd/MM HH:mm")}
        </p>
        {!sameDay && <p className="text-xs text-zinc-500">depuis le {format(b.start, "dd/MM")}</p>}
      </div>

      <div className="min-w-0">
        <p className="truncate text-sm font-medium">
          {b.vehicle.name} <span className="font-normal text-zinc-500">· {b.vehicle.plate}</span>
        </p>
        <p className="truncate text-xs text-zinc-500">{[b.vehicle.location, b.subject].filter(Boolean).join(" · ")}</p>
      </div>

      <div className="flex min-w-0 items-center gap-2.5">
        {b.organizer ? (
          <>
            <Avatar name={b.organizer.name} email={b.organizer.email} size={26} />
            <span className="truncate text-sm">{b.organizer.name}</span>
            <a
              href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(b.organizer.email)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              title="Écrire sur Teams"
            >
              <MessageSquare className="size-3.5" />
            </a>
            <a
              href={`mailto:${b.organizer.email}`}
              className="rounded p-1 text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              title="Envoyer un e-mail"
            >
              <Mail className="size-3.5" />
            </a>
          </>
        ) : (
          <span className="text-sm text-zinc-500">—</span>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 lg:w-64 lg:justify-end">
        <div className="text-right">
          <p className={cn("flex items-center justify-end gap-1.5 text-[13px] whitespace-nowrap", s.text)}>
            <span className={cn("size-1.5 rounded-full", s.dot)} />
            {s.label}
          </p>
          {log.handedAt && (
            <p className="text-[11px] text-zinc-500 tabular-nums">
              {log.returnedAt
                ? `Rendues ${fmtTime(new Date(log.returnedAt))}${log.endKm && log.startKm ? ` · ${log.endKm - log.startKm} km` : ""}`
                : `Remises ${fmtTime(new Date(log.handedAt))}${log.handedBy ? ` · ${log.handedBy.split(" ")[0]}` : ""}`}
            </p>
          )}
        </div>
        {status === "toHand" || status === "upcoming" || status === "missed" ? (
          <Button size="sm" icon={<KeyRound />} onClick={() => onAction({ booking: b, kind: "hand" })}>
            Remettre
          </Button>
        ) : status === "out" || status === "overdue" ? (
          <Button size="sm" variant="secondary" onClick={() => onAction({ booking: b, kind: "return" })}>
            Retour
          </Button>
        ) : (
          <Button size="sm" variant="ghost" icon={<Undo2 />} loading={update.isPending} onClick={undo} title="Annuler le retour">
            Annuler
          </Button>
        )}
      </div>
    </div>
  );
}

function KeyDialog({ action, onClose }: { action: Action | null; onClose: () => void }) {
  const { data: me } = useMe();
  const update = useUpdateKeyLog();
  const [km, setKm] = useState("");
  const [notes, setNotes] = useState("");
  const b = action?.booking;
  const hand = action?.kind === "hand";
  const kmValue = km.trim() ? Number(km) : undefined;
  const invalidKm =
    kmValue !== undefined &&
    (!Number.isFinite(kmValue) || kmValue < 0 || (!hand && b?.keyLog.startKm !== undefined && kmValue < b.keyLog.startKm));

  const confirm = async () => {
    if (!b || invalidKm) return;
    const by = me?.name ?? "Accueil";
    const at = new Date().toISOString();
    const log: KeyLog = hand
      ? { handedAt: at, handedBy: by, startKm: kmValue, notes: notes.trim() || undefined }
      : {
          ...b.keyLog,
          returnedAt: at,
          returnedBy: by,
          endKm: kmValue,
          notes: [b.keyLog.notes, notes.trim()].filter(Boolean).join(" — ") || undefined,
        };
    try {
      await update.mutateAsync({ booking: b, log });
      toast.success(hand ? `Clés remises à ${b.organizer?.name ?? "l'emprunteur"}` : `Clés de ${b.vehicle.name} rendues`);
      setKm("");
      setNotes("");
      onClose();
    } catch (error) {
      toast.error("Enregistrement impossible", { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <Dialog.Root open={Boolean(action)} onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content
          aria-describedby={undefined}
          className="data-[state=open]:animate-pop fixed top-1/2 left-1/2 z-50 w-[min(420px,calc(100vw-32px))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-zinc-200 bg-white p-5 shadow-2xl dark:border-white/10 dark:bg-[#161618]"
        >
          {b && (
            <>
              <Dialog.Title className="font-semibold">{hand ? "Remise des clés" : "Retour des clés"}</Dialog.Title>
              <div className="mt-3 rounded-lg border border-zinc-200 px-3.5 py-3 text-sm dark:border-white/10">
                <p className="font-medium">
                  {b.vehicle.name} · {b.vehicle.plate}
                </p>
                <p className="text-zinc-500">
                  {b.organizer?.name} · {fmtTime(b.start)} – {fmtTime(b.end)}
                </p>
                {!hand && b.keyLog.startKm !== undefined && (
                  <p className="mt-1 text-xs text-zinc-500 tabular-nums">Kilométrage au départ : {b.keyLog.startKm} km</p>
                )}
              </div>
              <label className="mt-4 block">
                <span className="mb-1 block text-xs text-zinc-500">Kilométrage {hand ? "au départ" : "au retour"} (facultatif)</span>
                <input
                  inputMode="numeric"
                  value={km}
                  onChange={(e) => setKm(e.target.value.replace(/[^\d]/g, ""))}
                  placeholder="ex. 12 480"
                  className={cn(
                    "h-9 w-full rounded-md border bg-white px-3 text-sm tabular-nums outline-none focus:ring-2 dark:bg-zinc-900",
                    invalidKm
                      ? "border-rose-500 focus:ring-rose-500/20"
                      : "border-zinc-200 focus:border-brand-500 focus:ring-brand-500/20 dark:border-white/10",
                  )}
                />
                {invalidKm && (
                  <span className="mt-1 block text-xs text-rose-600">Le kilométrage de retour doit être supérieur à celui du départ.</span>
                )}
              </label>
              <label className="mt-3 block">
                <span className="mb-1 block text-xs text-zinc-500">
                  {hand ? "Remarque" : "État du véhicule, carburant, remarque"} (facultatif)
                </span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value.slice(0, 300))}
                  rows={2}
                  className="w-full resize-none rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-white/10 dark:bg-zinc-900"
                />
              </label>
              <div className="mt-5 flex justify-end gap-2">
                <Dialog.Close asChild>
                  <Button variant="secondary" size="sm">
                    Annuler
                  </Button>
                </Dialog.Close>
                <Button size="sm" loading={update.isPending} disabled={invalidKm} onClick={confirm}>
                  {hand ? "Confirmer la remise" : "Confirmer le retour"}
                </Button>
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className="flex size-8 items-center justify-center text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
    >
      {children}
    </button>
  );
}
