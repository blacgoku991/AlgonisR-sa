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
        <div className="flex items-center justify-center gap-3 bg-surface px-4 py-2 text-center text-xs text-muted">
          <span>Démonstration — données fictives, aucune invitation n'est envoyée.</span>
          <button
            onClick={() => {
              resetDemo();
              window.location.reload();
            }}
            className="hidden items-center gap-1 underline underline-offset-2 hover:text-zinc-950 sm:inline-flex dark:hover:text-white"
          >
            <RotateCcw className="size-3" /> Réinitialiser
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-line bg-[var(--bg)]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center gap-8 px-5 sm:px-8">
          <a href={hrefFor("book")} className="flex items-center gap-2.5" aria-label="Retour à la réservation">
            <Logo className="size-7" />
            <span className="text-[15px] font-semibold tracking-tight">{config.appName}</span>
          </a>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Navigation principale">
            {items.map((item) => {
              const active = view === item.view;
              return (
                <a
                  key={item.view}
                  href={hrefFor(item.view)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-sm transition-colors",
                    active
                      ? "bg-surface font-medium text-zinc-950 dark:text-white"
                      : "text-muted hover:text-zinc-950 dark:hover:text-white",
                  )}
                >
                  {item.label}
                  {item.view === "bookings" && upcoming > 0 && <span className="ml-1.5 text-muted tabular-nums">{upcoming}</span>}
                </a>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-1">
            {!embedded && <ThemeButton theme={theme} onToggle={onToggleTheme} />}
            <UserMenu onSignOut={embedded ? undefined : onSignOut} compact />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-5 pt-10 pb-28 sm:px-8 sm:pt-16 md:pb-20">{children}</main>

      {/* Navigation mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-line bg-[var(--bg)]/90 backdrop-blur-xl md:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation"
      >
        {items.map(({ view: v, short, icon: Icon }) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => navigate(v)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "text-zinc-950 dark:text-white" : "text-muted",
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
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-zinc-950 dark:hover:text-white"
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
          <Avatar name={me.name} email={email} size={compact ? 28 : 26} />
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
                className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-2 text-sm text-zinc-700 outline-none data-[highlighted]:bg-zinc-100 dark:text-zinc-200 dark:data-[highlighted]:bg-white/10"
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
