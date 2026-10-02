import { CalendarDays, CircleAlert, CircleCheck, MessageSquareText, PencilLine, Send, TriangleAlert, Users, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { config } from "../config";
import {
  availabilityWindow,
  useAvailability,
  useCreateBooking,
  useMe,
  useMyBookings,
  usePeopleAvailability,
  useResources,
} from "../hooks/queries";
import { BookingConflictError, validateBooking } from "../lib/rules";
import { conflictsWith, personState } from "../lib/availability";
import { cn } from "../lib/cn";
import { KIND_LABEL } from "../lib/features";
import { combine, dayKey, fmtDuration, fmtLongDate, fmtTime, format, timeOptions } from "../lib/time";
import { GraphError } from "../services/graph";
import { useBooking, type Selection } from "../store";
import type { Booking, BookingStep, Person } from "../types";
import { PeoplePicker } from "./PeoplePicker";
import { ResourceArt } from "./ResourceArt";
import { SuccessView } from "./SuccessView";
import { Button } from "./ui/Button";
import { Sheet, SheetClose } from "./ui/Sheet";
import { TeamsLogo } from "./ui/TeamsLogo";

const SUBJECTS = {
  room: ["Réunion d'équipe", "Point client", "Entretien", "Atelier", "Formation"],
  vehicle: ["Rendez-vous client", "Déplacement", "Livraison", "Intervention sur site"],
};

export function BookingSheet() {
  const selection = useBooking((s) => s.selection);
  const close = useBooking((s) => s.close);
  const [booked, setBooked] = useState<Booking | null>(null);

  useEffect(() => {
    if (selection) setBooked(null);
  }, [selection]);

  return (
    <Sheet
      open={Boolean(selection)}
      onOpenChange={(open) => !open && close()}
      title={selection ? `Réserver ${selection.resource.name}` : "Réservation"}
    >
      {selection && (
        <AnimatePresence mode="wait" initial={false}>
          {booked ? (
            <motion.div
              key="done"
              className="flex min-h-0 flex-1 flex-col"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <SuccessView booking={booked} resource={selection.resource} onClose={close} />
            </motion.div>
          ) : (
            <motion.div key="form" className="flex min-h-0 flex-1 flex-col" exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
              <BookingForm selection={selection} onBooked={setBooked} />
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </Sheet>
  );
}

function BookingForm({ selection, onBooked }: { selection: Selection; onBooked: (b: Booking) => void }) {
  const { resource } = selection;
  const { data: me } = useMe();
  const [day, setDay] = useState(dayKey(selection.start));
  const [startTime, setStartTime] = useState(format(selection.start, "HH:mm"));
  const [endDay, setEndDay] = useState(dayKey(selection.end));
  const [endTime, setEndTime] = useState(format(selection.end, "HH:mm"));
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState("");
  const [attendees, setAttendees] = useState<Person[]>([]);
  const [teams, setTeams] = useState(resource.kind === "room");
  const [message, setMessage] = useState("");
  const [showMessage, setShowMessage] = useState(false);
  const create = useCreateBooking();
  const { data: myBookings } = useMyBookings();
  const [step, setStep] = useState<BookingStep | null>(null);

  const start = combine(day, startTime);
  const end = combine(resource.kind === "vehicle" ? endDay : day, endTime);
  const validRange = end > start;

  // Disponibilité de la ressource (même cache que la page de recherche).
  const { from, to } = availabilityWindow(start, validRange ? end : start);
  const { data: resources } = useResources(resource.kind);
  const { data: availability, isFetching } = useAvailability(resource.kind, resources, from, to);
  const conflicts = useMemo(
    () => (availability?.[resource.id] ? conflictsWith(availability[resource.id].busy, start, end) : []),
    [availability, resource.id, start.getTime(), end.getTime()],
  );

  const emails = attendees.filter((p) => !p.isGroup && !p.isExternal).map((p) => p.email);
  const { data: peopleAvailability } = usePeopleAvailability(emails, start, end);
  const statusFor = (email: string) => personState(peopleAvailability?.[email.toLowerCase()], start, end);

  const headcount = attendees.length + 1;
  const overCapacity = resource.capacity !== undefined && headcount > resource.capacity;
  const finalSubject = subject.trim() || (resource.kind === "room" ? `Réunion · ${resource.name}` : `Déplacement · ${resource.name}`);
  const ruleErrors = validateBooking({ resource, start, end, attendees, subject: finalSubject }, myBookings ?? []);
  const blocked = ruleErrors.length > 0 || conflicts.length > 0;

  const submit = async () => {
    if (blocked || create.isPending) return;
    try {
      const booking = await create.mutateAsync({
        request: { resource, start, end, subject: finalSubject, attendees, message, teamsMeeting: teams },
        onStep: setStep,
      });
      onBooked(booking);
    } catch (error) {
      if (error instanceof BookingConflictError) {
        toast.error("Créneau déjà pris", { description: error.message });
      } else {
        const description =
          error instanceof GraphError && error.status === 403
            ? "Accès refusé par Microsoft 365. Vérifiez les autorisations de l'application."
            : error instanceof Error
              ? error.message
              : "Erreur inattendue";
        toast.error("La réservation n'a pas abouti", { description });
      }
    } finally {
      setStep(null);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      void submit();
    }
  };

  const times = timeOptions(0, 23, 15).concat("23:45");
  const startTimes = timeOptions(Math.min(config.dayStartHour, 6), 23, 15);

  return (
    <div className="flex min-h-0 flex-1 flex-col" onKeyDown={onKeyDown}>
      <div className="relative shrink-0 px-6 pt-6">
        <ResourceArt resource={resource} className="aspect-[2/1] rounded-3xl" />
        <SheetClose
          className="absolute top-9 right-9 flex size-8 items-center justify-center rounded-full bg-[var(--bg)] text-muted shadow-sm transition-colors hover:text-zinc-950 dark:hover:text-white"
          aria-label="Fermer"
        >
          <X className="size-4" />
        </SheetClose>
        <p className="mt-6 text-sm text-muted">Réserver {KIND_LABEL[resource.kind].article}</p>
        <h2 className="truncate text-[28px] leading-tight font-semibold tracking-[-0.02em]">{resource.name}</h2>
        <p className="mt-1 truncate text-sm text-muted">
          {(resource.kind === "room"
            ? [resource.building, resource.floor, resource.capacity && `${resource.capacity} pers.`]
            : [resource.model, resource.plate, resource.location]
          )
            .filter(Boolean)
            .join(" · ")}
        </p>
      </div>

      <div className="scrollbar-thin min-h-0 flex-1 space-y-8 overflow-y-auto px-6 py-6">
        {/* Créneau */}
        <section className="rounded-2xl bg-surface p-5">
          <div className="flex items-start gap-3">
            <CalendarDays className="mt-0.5 size-4 shrink-0 text-muted" />
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{fmtLongDate(start)}</p>
              <p className="text-sm text-zinc-600 tabular-nums dark:text-zinc-300">
                {validRange ? (
                  <>
                    {fmtTime(start)} → {resource.kind === "vehicle" && endDay !== day ? `${format(end, "dd/MM")} ` : ""}
                    {fmtTime(end)}{" "}
                    <span className="text-zinc-400">· {fmtDuration(Math.round((end.getTime() - start.getTime()) / 60000))}</span>
                  </>
                ) : (
                  <span className="text-rose-600">L'heure de fin doit suivre l'heure de début</span>
                )}
              </p>
            </div>
            <Button variant="ghost" size="sm" icon={<PencilLine />} onClick={() => setEditing((e) => !e)}>
              {editing ? "OK" : "Modifier"}
            </Button>
          </div>

          <AnimatePresence initial={false}>
            {editing && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-2 gap-2 pt-4 sm:grid-cols-[1.4fr_1fr_1fr]">
                  <Field label="Date" className="col-span-2 sm:col-span-1">
                    <input
                      type="date"
                      value={day}
                      min={dayKey(new Date())}
                      onChange={(e) => {
                        if (!e.target.value) return;
                        setDay(e.target.value);
                        if (endDay < e.target.value) setEndDay(e.target.value);
                      }}
                      className={inputClass}
                    />
                  </Field>
                  <Field label="Début">
                    <select value={startTime} onChange={(e) => setStartTime(e.target.value)} className={inputClass}>
                      {startTimes.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Fin">
                    <select value={endTime} onChange={(e) => setEndTime(e.target.value)} className={inputClass}>
                      {times.map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </Field>
                  {resource.kind === "vehicle" && (
                    <Field label="Date de retour" className="col-span-2 sm:col-span-3">
                      <input
                        type="date"
                        value={endDay}
                        min={day}
                        onChange={(e) => e.target.value && setEndDay(e.target.value)}
                        className={inputClass}
                      />
                    </Field>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="mt-3 border-t border-line pt-3 text-sm">
            {ruleErrors.length > 0 ? (
              <ul className="space-y-1">
                {ruleErrors.map((e) => (
                  <li key={e} className="flex items-start gap-2 font-medium text-amber-700 dark:text-amber-300">
                    <CircleAlert className="mt-0.5 size-4 shrink-0" /> {e}
                  </li>
                ))}
              </ul>
            ) : conflicts.length > 0 ? (
              <p className="flex items-center gap-2 font-medium text-rose-700 dark:text-rose-300">
                <TriangleAlert className="size-4 shrink-0" />
                Conflit avec {conflicts[0].subject ? `« ${conflicts[0].subject} »` : "une réservation"} ({fmtTime(conflicts[0].start)} –{" "}
                {fmtTime(conflicts[0].end)})
              </p>
            ) : (
              <p className={cn("flex items-center gap-2 font-medium text-emerald-700 dark:text-emerald-300", isFetching && "opacity-60")}>
                <CircleCheck className="size-4" /> {resource.name} est {resource.kind === "room" ? "libre" : "disponible"} sur ce créneau
              </p>
            )}
          </div>
        </section>

        {/* Objet */}
        <section>
          <label htmlFor="subject" className="mb-2 block text-sm font-semibold">
            Objet
          </label>
          <input
            id="subject"
            autoFocus
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            placeholder={finalSubject}
            maxLength={255}
            className="h-12 w-full rounded-lg border border-line bg-transparent px-4 text-[15px] transition-all outline-none placeholder:text-zinc-400 focus:border-zinc-400"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {SUBJECTS[resource.kind].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSubject(s)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  subject === s
                    ? "border-brand-400 bg-brand-500/10 text-brand-700 dark:text-brand-200"
                    : "border-line text-zinc-600 hover:border-zinc-300 hover:bg-surface dark:text-zinc-300 dark:hover:bg-white/5",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </section>

        {/* Participants */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <span className="flex items-center gap-2 text-sm font-semibold">
              <Users className="size-4 text-zinc-400" />{" "}
              {resource.kind === "room" ? "Inviter des participants" : "Passagers / personnes à prévenir"}
            </span>
            {resource.capacity !== undefined && (
              <span className={cn("text-xs font-medium tabular-nums", overCapacity ? "text-rose-600" : "text-zinc-400")}>
                {headcount} / {resource.capacity} {resource.kind === "room" ? "personnes" : "places"}
              </span>
            )}
          </div>
          <PeoplePicker value={attendees} onChange={setAttendees} statusFor={statusFor} exclude={me ? [me.email] : []} />
          {overCapacity && (
            <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-rose-600">
              <TriangleAlert className="size-3.5" /> {headcount} personnes pour {resource.capacity}{" "}
              {resource.kind === "room" ? "places assises" : "places"}.
            </p>
          )}
          {attendees.length === 0 && (
            <p className="mt-2 text-xs text-zinc-400">
              Astuce : collez une liste d'adresses e-mail pour inviter plusieurs personnes d'un coup.
            </p>
          )}
        </section>

        {/* Teams */}
        <section>
          <button
            type="button"
            role="switch"
            aria-checked={teams}
            onClick={() => setTeams((t) => !t)}
            className={cn(
              "flex w-full items-center gap-3.5 rounded-lg border p-4 text-left transition-all",
              teams ? "border-teams/40 bg-teams/[0.07] dark:bg-teams/15" : "border-line hover:bg-surface",
            )}
          >
            <TeamsLogo className={cn("size-7 shrink-0 transition-all", !teams && "opacity-50 grayscale")} />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Réunion Microsoft Teams</span>
              <span className="block text-xs text-muted">
                {teams
                  ? "Un lien « Rejoindre » sera ajouté à l'invitation"
                  : "Ajouter un lien de visioconférence pour les participants à distance"}
              </span>
            </span>
            <span
              className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                teams ? "bg-teams" : "bg-zinc-300 dark:bg-zinc-600",
              )}
            >
              <motion.span
                className="absolute top-0.5 size-5 rounded-full bg-white shadow"
                animate={{ left: teams ? 22 : 2 }}
                transition={{ type: "spring", damping: 25, stiffness: 500 }}
              />
            </span>
          </button>
        </section>

        {/* Message */}
        <section>
          {showMessage || message ? (
            <>
              <label htmlFor="message" className="mb-2 block text-sm font-semibold">
                Message aux participants
              </label>
              <textarea
                id="message"
                autoFocus={showMessage && !message}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="Ordre du jour, documents à préparer…"
                className="w-full resize-none rounded-lg border border-line bg-transparent px-4 py-3 text-[15px] outline-none placeholder:text-zinc-400 focus:border-zinc-400"
              />
            </>
          ) : (
            <button
              type="button"
              onClick={() => setShowMessage(true)}
              className="flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300"
            >
              <MessageSquareText className="size-4" /> Ajouter un message ou un ordre du jour
            </button>
          )}
        </section>
      </div>

      {/* Pied */}
      <div className="shrink-0 border-t border-line bg-[var(--bg)] px-6 py-5">
        {step ? (
          <BookingProgress step={step} hasAttendees={attendees.length > 0} kind={resource.kind} />
        ) : (
          <p className="mb-3 text-center text-xs text-muted">
            {attendees.length > 0
              ? `${attendees.length} invitation${attendees.length > 1 ? "s" : ""} envoyée${attendees.length > 1 ? "s" : ""} dans Outlook · visible${attendees.length > 1 ? "s" : ""} dans le calendrier Teams`
              : "L'événement sera ajouté à votre calendrier Outlook et Teams"}
          </p>
        )}
        <Button
          size="lg"
          className="w-full"
          disabled={blocked}
          loading={create.isPending}
          icon={!create.isPending && <Send />}
          onClick={submit}
        >
          {create.isPending
            ? "Réservation sécurisée en cours…"
            : attendees.length > 0
              ? "Réserver et envoyer les invitations"
              : `Réserver ${KIND_LABEL[resource.kind].article}`}
        </Button>
        <p className="mt-2 hidden text-center text-[11px] text-zinc-400 md:block">
          <kbd className="rounded border border-line px-1 font-sans">Ctrl</kbd> +{" "}
          <kbd className="rounded border border-line px-1 font-sans">Entrée</kbd> pour valider
        </p>
      </div>
    </div>
  );
}

const STEPS: { id: BookingStep; label: (kind: "room" | "vehicle") => string }[] = [
  { id: "checking", label: () => "Vérification du créneau en temps réel" },
  { id: "reserving", label: (k) => (k === "room" ? "Blocage de la salle" : "Blocage du véhicule") },
  { id: "confirming", label: () => "Confirmation par Exchange (anti double réservation)" },
  { id: "inviting", label: () => "Envoi des invitations Outlook / Teams" },
];

function BookingProgress({ step, hasAttendees, kind }: { step: BookingStep; hasAttendees: boolean; kind: "room" | "vehicle" }) {
  const steps = STEPS.filter((s) => s.id !== "inviting" || hasAttendees);
  const current = steps.findIndex((s) => s.id === step);
  return (
    <ol className="mb-3 space-y-1.5 text-xs" aria-live="polite">
      {steps.map((s, i) => (
        <li
          key={s.id}
          className={cn(
            "flex items-center gap-2",
            i < current ? "text-muted" : i === current ? "font-medium text-zinc-900 dark:text-white" : "text-zinc-400 dark:text-zinc-600",
          )}
        >
          {i < current ? (
            <CircleCheck className="size-3.5 text-emerald-500" />
          ) : i === current ? (
            <span className="size-3.5 animate-spin rounded-full border-2 border-zinc-300 border-t-brand-500 dark:border-zinc-700 dark:border-t-brand-400" />
          ) : (
            <span className="size-3.5 rounded-full border border-zinc-300 dark:border-zinc-700" />
          )}
          {s.label(kind)}
        </li>
      ))}
    </ol>
  );
}

const inputClass =
  "h-11 w-full rounded-md border border-line bg-transparent px-3 text-sm tabular-nums outline-none focus:border-zinc-400 dark:[color-scheme:dark]";

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-[11px] font-semibold tracking-wide text-muted uppercase">{label}</span>
      {children}
    </label>
  );
}
