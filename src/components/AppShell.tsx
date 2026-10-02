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

interface NavItem {
  view: View;
  label: string;
  short: string;
  icon: typeof CalendarPlus;
}

const NAV: NavItem[] = [
  { view: "book", label: "Réserver", short: "Réserver", icon: CalendarPlus },
  { view: "planning", label: "Planning", short: "Planning", icon: ChartGantt },
  { view: "bookings", label: "Mes réservations", short: "Mes résas", icon: CalendarCheck },
];
const RECEPTION: NavItem = { view: "reception", label: "Accueil", short: "Accueil", icon: KeyRound };

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
  const upcoming = bookings?.filter((b) => b.end > new Date()).length ?? 0;
  const items = role?.reception ? [...NAV, RECEPTION] : NAV;

  return (
    <div className="flex min-h-dvh flex-col">
      {config.demo && (
        <div className="flex items-center justify-center gap-3 bg-brand-100 px-4 py-2 text-center text-xs text-brand-700">
          <span>Démonstration — données fictives, aucune invitation n'est envoyée.</span>
          <button
            onClick={() => {
              resetDemo();
              window.location.reload();
            }}
            className="hidden items-center gap-1 underline underline-offset-2 hover:opacity-80 sm:inline-flex"
          >
            <RotateCcw className="size-3" /> Réinitialiser
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 bg-[var(--bg)]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center gap-6 px-5 sm:px-10">
          <a href={hrefFor("book")} className="flex items-center gap-3" aria-label="Retour à la réservation">
            <Logo className="size-9" />
            <span className="leading-tight">
              <span className="block text-base font-bold tracking-tight">{config.appName}</span>
              <span className="hidden text-xs text-muted sm:block">{config.companyName}</span>
            </span>
          </a>
          <nav
            className="mx-auto hidden items-center gap-1 rounded-full border border-line bg-surface p-1.5 md:flex"
            aria-label="Navigation principale"
          >
            {items.map(({ view: v, label, icon: Icon }) => {
              const active = view === v;
              return (
                <a
                  key={v}
                  href={hrefFor(v)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors",
                    active ? "bg-brand-600 text-accent-fg" : "text-muted hover:bg-surface-2 hover:text-slate-900 dark:hover:text-white",
                  )}
                >
                  <Icon className="size-4" strokeWidth={active ? 2.2 : 1.8} />
                  {label}
                  {v === "bookings" && upcoming > 0 && (
                    <span
                      className={cn(
                        "grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-semibold tabular-nums",
                        active ? "bg-accent-fg/20" : "bg-brand-100 text-brand-700",
                      )}
                    >
                      {upcoming}
                    </span>
                  )}
                </a>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2 md:ml-0">
            {!embedded && <ThemeButton theme={theme} onToggle={onToggleTheme} />}
            <UserMenu onSignOut={embedded ? undefined : onSignOut} compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-5 pt-6 pb-32 sm:px-10 sm:pt-8 md:pb-24">{children}</main>

      {/* Navigation mobile */}
      <nav
        className="fixed inset-x-3 bottom-3 z-30 flex rounded-3xl border border-line bg-surface/95 p-1.5 shadow-lg backdrop-blur-xl md:hidden"
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
                active ? "bg-brand-100 text-brand-700" : "text-muted",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2 : 1.6} />
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
