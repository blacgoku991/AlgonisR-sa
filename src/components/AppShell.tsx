import { CalendarCheck, CalendarPlus, ChartGantt, KeyRound, LogOut, Moon, RotateCcw, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { config } from "../config";
import { useMe, useMyBookings, useRole } from "../hooks/queries";
import { cn } from "../lib/cn";
import { hrefFor, navigate, useView } from "../router";
import { resetDemo } from "../services/demoService";
import type { View } from "../store";
import { Avatar } from "./ui/Avatar";
import { Logo } from "./ui/Logo";
import { fmtRelativeDay, fmtTime } from "../lib/time";

interface NavItem {
  view: View;
  label: string;
  short: string;
  hint: string;
  icon: typeof CalendarPlus;
  /** Couleur propre à l'onglet (pastille de l'icône). */
  tone: string;
}

const NAV: NavItem[] = [
  { view: "book", label: "Réserver", short: "Réserver", hint: "Salles et véhicules", icon: CalendarPlus, tone: "bg-teal-500/15 text-teal-600 dark:text-teal-300" },
  { view: "planning", label: "Planning", short: "Planning", hint: "Vue de la journée", icon: ChartGantt, tone: "bg-violet-500/15 text-violet-600 dark:text-violet-300" },
  { view: "bookings", label: "Mes réservations", short: "Mes résas", hint: "À venir et passées", icon: CalendarCheck, tone: "bg-amber-500/15 text-amber-600 dark:text-amber-300" },
];
const RECEPTION: NavItem = {
  view: "reception",
  label: "Accueil",
  short: "Accueil",
  hint: "Clés des véhicules",
  icon: KeyRound,
  tone: "bg-rose-500/15 text-rose-600 dark:text-rose-300",
};

interface AppShellProps {
  children: ReactNode;
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onSignOut?: () => void;
  embedded: boolean;
}

export function AppShell({ children, theme, onToggleTheme, onSignOut, embedded }: AppShellProps) {
  const view = useView();
  const { data: bookings } = useMyBookings();
  const { data: role } = useRole();
  const now = new Date();
  const future = (bookings ?? []).filter((b) => b.end > now && !b.isCancelled).sort((a, b) => a.start.getTime() - b.start.getTime());
  const upcoming = future.length;
  const next = future[0];
  const items = role?.reception ? [...NAV, RECEPTION] : NAV;

  return (
    <div className="min-h-dvh lg:pl-[300px]">
      {/* Menu latéral (ordinateur) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[300px] flex-col p-4 lg:flex">
        <div className="flex h-full flex-col rounded-[2rem] border border-line bg-surface px-5 py-7">
          <a href={hrefFor("book")} className="flex items-center gap-3 px-2" aria-label="Retour à la réservation">
            <Logo className="size-11" />
            <span className="leading-tight">
              <span className="block text-lg font-bold tracking-tight">{config.appName}</span>
              <span className="block text-xs text-muted">{config.companyName} · réservations</span>
            </span>
          </a>

          <p className="mt-14 mb-4 px-3 text-[11px] font-semibold tracking-[0.12em] text-muted uppercase">Menu</p>
          <nav className="space-y-2.5" aria-label="Navigation principale">
            {items.map(({ view: v, label, hint, icon: Icon, tone }) => {
              const active = view === v;
              return (
                <a
                  key={v}
                  href={hrefFor(v)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3.5 rounded-2xl p-2.5 transition-all",
                    active ? "bg-brand-600 text-accent-fg shadow-[0_12px_30px_-14px_var(--ink)]" : "hover:bg-surface-2",
                  )}
                >
                  <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl", active ? "bg-accent-fg/15" : tone)}>
                    <Icon className="size-5" strokeWidth={2} />
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block text-[15px] font-semibold">{label}</span>
                    <span className={cn("block truncate text-xs", active ? "opacity-75" : "text-muted")}>{hint}</span>
                  </span>
                  {v === "bookings" && upcoming > 0 && (
                    <span
                      className={cn(
                        "grid h-6 min-w-6 place-items-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                        active ? "bg-accent-fg/20" : "bg-amber-500/15 text-amber-600 dark:text-amber-300",
                      )}
                    >
                      {upcoming}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>

          {next && (
            <a
              href={hrefFor("bookings")}
              className="mt-10 block rounded-2xl bg-[var(--hero)] p-5 transition-transform hover:-translate-y-0.5"
            >
              <p className="text-[11px] font-semibold tracking-[0.12em] text-brand-700 uppercase">Prochaine réservation</p>
              <p className="mt-2 truncate font-semibold">{next.subject}</p>
              <p className="mt-0.5 truncate text-sm text-muted">
                {fmtRelativeDay(next.start)} · {fmtTime(next.start)}
                {next.resourceName || next.resource?.name ? ` · ${next.resource?.name ?? next.resourceName}` : ""}
              </p>
            </a>
          )}

          <div className="mt-auto space-y-3">
            {config.demo && (
              <button
                onClick={() => {
                  resetDemo();
                  window.location.reload();
                }}
                className="flex w-full items-center gap-2 px-3 text-xs text-muted hover:text-brand-700"
                title="Données fictives, aucune invitation n'est envoyée"
              >
                <span className="size-1.5 rounded-full bg-amber-500" /> Mode démo
                <RotateCcw className="ml-auto size-3" />
              </button>
            )}
            <div className="flex items-center gap-2 border-t border-line pt-4">
              <UserMenu onSignOut={embedded ? undefined : onSignOut} />
              {!embedded && <ThemeButton theme={theme} onToggle={onToggleTheme} />}
            </div>
          </div>
        </div>
      </aside>

      {/* En-tête (tablette et mobile) */}
      <header className="sticky top-0 z-30 bg-[var(--bg)]/85 backdrop-blur-xl lg:hidden">
        {config.demo && (
          <p className="bg-brand-100 px-4 py-1.5 text-center text-xs text-brand-700">Démonstration — données fictives</p>
        )}
        <div className="flex h-16 items-center gap-3 px-5 sm:px-8">
          <a href={hrefFor("book")} className="flex items-center gap-2.5" aria-label="Retour à la réservation">
            <Logo className="size-9" />
            <span className="text-base font-bold tracking-tight">{config.appName}</span>
          </a>
          <div className="ml-auto flex items-center gap-2">
            {!embedded && <ThemeButton theme={theme} onToggle={onToggleTheme} />}
            <UserMenu onSignOut={embedded ? undefined : onSignOut} compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1180px] px-5 pt-6 pb-36 sm:px-10 lg:px-16 lg:pt-12 lg:pb-24">{children}</main>

      {/* Navigation mobile */}
      <nav
        className="fixed inset-x-3 z-30 flex rounded-3xl border border-line bg-surface/95 p-1.5 shadow-lg backdrop-blur-xl lg:hidden"
        style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
        aria-label="Navigation"
      >
        {items.map(({ view: v, short, icon: Icon }) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => navigate(v)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[11px] font-medium transition-colors",
                active ? "bg-brand-600 text-accent-fg" : "text-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} />
              {short}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function ThemeButton({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-surface text-muted transition-colors hover:text-brand-600"
      aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
      title={theme === "dark" ? "Thème clair" : "Thème sombre"}
    >
      {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

function UserMenu({ onSignOut, compact }: { onSignOut?: () => void; compact?: boolean }) {
  const { data: me } = useMe();
  if (!me) return <div className="skeleton h-9 flex-1 rounded-md" />;
  const email = config.demo ? me.email : "me";
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button
          className={cn(
            "flex min-w-0 items-center gap-2.5 rounded-full text-left transition-colors hover:bg-surface",
            compact ? "p-1" : "h-11 flex-1 px-2",
          )}
          aria-label="Mon compte"
        >
          <Avatar name={me.name} email={email} size={compact ? 36 : 26} />
          {!compact && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium">{me.name}</span>
              <span className="block truncate text-[11px] text-muted">{me.jobTitle ?? me.email}</span>
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={compact ? "end" : "start"}
          side={compact ? "bottom" : "top"}
          sideOffset={8}
          className="data-[state=open]:animate-pop z-50 w-64 rounded-2xl border border-line bg-[var(--bg)] p-1.5 shadow-xl"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{me.name}</p>
            <p className="truncate text-xs text-muted">{me.email}</p>
          </div>
          {onSignOut && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-surface-2" />
              <DropdownMenu.Item
                onSelect={onSignOut}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:data-[highlighted]:bg-white/10"
              >
                <LogOut className="size-4" /> Se déconnecter
              </DropdownMenu.Item>
            </>
          )}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
