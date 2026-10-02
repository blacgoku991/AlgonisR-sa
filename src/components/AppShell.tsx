import { CalendarCheck, CalendarDays, ChartGantt, LogOut, Moon, RotateCcw, Sun } from "lucide-react";
import { motion } from "motion/react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { config } from "../config";
import { useMe, useMyBookings } from "../hooks/queries";
import { cn } from "../lib/cn";
import { hrefFor, navigate, useView } from "../router";
import { resetDemo } from "../services/demoService";
import type { View } from "../store";
import { Avatar } from "./ui/Avatar";
import { Logo } from "./ui/Logo";

const NAV: { view: View; label: string; icon: typeof CalendarDays }[] = [
  { view: "book", label: "Réserver", icon: CalendarDays },
  { view: "planning", label: "Planning", icon: ChartGantt },
  { view: "bookings", label: "Mes réservations", icon: CalendarCheck },
];

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
  const upcoming = bookings?.filter((b) => b.end > new Date()).length ?? 0;

  return (
    <div className="flex min-h-dvh flex-col">
      {config.demo && (
        <div className="flex items-center justify-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.08] px-4 py-1.5 text-center text-xs text-amber-800 dark:text-amber-200/90">
          <span>
            <span className="font-medium">Mode démonstration</span> · données fictives, aucune invitation n'est envoyée
          </span>
          <button
            onClick={() => {
              resetDemo();
              window.location.reload();
            }}
            className="hidden items-center gap-1 underline-offset-2 hover:underline sm:inline-flex"
          >
            <RotateCcw className="size-3" /> Réinitialiser
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/90 backdrop-blur dark:border-white/[0.07] dark:bg-[#0c0c0e]/90">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <a href={hrefFor("book")} className="flex items-center gap-2.5" aria-label="Accueil">
            <Logo className="size-7" />
            <span className="text-sm font-semibold tracking-tight">{config.appName}</span>
            <span className="hidden text-sm text-zinc-400 sm:inline dark:text-zinc-500">/ {config.companyName}</span>
          </a>

          <nav className="hidden h-full items-stretch gap-1 md:flex" aria-label="Navigation principale">
            {NAV.map(({ view: v, label }) => {
              const active = view === v;
              return (
                <a
                  key={v}
                  href={hrefFor(v)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-2 px-3 text-sm transition-colors",
                    active
                      ? "text-zinc-900 dark:text-white"
                      : "text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100",
                  )}
                >
                  {label}
                  {v === "bookings" && upcoming > 0 && (
                    <span className="rounded bg-zinc-200 px-1.5 text-[11px] leading-[18px] text-zinc-700 tabular-nums dark:bg-zinc-800 dark:text-zinc-300">
                      {upcoming}
                    </span>
                  )}
                  {active && (
                    <motion.span
                      layoutId="nav-underline"
                      className="absolute inset-x-2 -bottom-px h-0.5 bg-zinc-900 dark:bg-white"
                      transition={{ type: "spring", damping: 35, stiffness: 500 }}
                    />
                  )}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            {!embedded && (
              <button
                onClick={onToggleTheme}
                className="flex size-9 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
              >
                {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
              </button>
            )}
            <UserMenu onSignOut={embedded ? undefined : onSignOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-24 sm:px-6 sm:pt-8 md:pb-12">{children}</main>

      {/* Barre de navigation mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-zinc-200 bg-white/95 backdrop-blur md:hidden dark:border-white/[0.08] dark:bg-[#0c0c0e]/95"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Navigation"
      >
        {NAV.map(({ view: v, label, icon: Icon }) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => navigate(v)}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px]",
                active ? "text-zinc-900 dark:text-white" : "text-zinc-500",
              )}
            >
              <span className="relative">
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.8} />
                {v === "bookings" && upcoming > 0 && (
                  <span className="absolute -top-1 -right-2 rounded bg-brand-600 px-1 text-[10px] leading-4 text-white tabular-nums">
                    {upcoming}
                  </span>
                )}
              </span>
              {label === "Mes réservations" ? "Mes résas" : label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function UserMenu({ onSignOut }: { onSignOut?: () => void }) {
  const { data: me } = useMe();
  if (!me) return <div className="skeleton size-[30px] rounded-full" />;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="ml-1 rounded-full" aria-label="Mon compte">
          <Avatar name={me.name} email={config.demo ? me.email : "me"} size={30} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="data-[state=open]:animate-pop z-50 w-64 rounded-lg border border-zinc-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#161618]"
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={me.name} email={config.demo ? me.email : "me"} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.name}</p>
              <p className="truncate text-xs text-zinc-500">{me.email}</p>
            </div>
          </div>
          {onSignOut && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-zinc-100 dark:bg-white/10" />
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
