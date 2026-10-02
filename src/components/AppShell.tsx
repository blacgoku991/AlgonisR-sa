import { CalendarCheck, CalendarDays, ChartGantt, LogOut, Moon, RotateCcw, Sparkles, Sun } from "lucide-react";
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
    <div className="ambient flex min-h-dvh flex-col">
      {config.demo && (
        <div className="bg-brand-gradient relative z-40 flex items-center justify-center gap-2 px-4 py-1.5 text-center text-xs font-medium text-white">
          <Sparkles className="size-3.5 shrink-0" />
          <span>
            <strong>Mode démo</strong> — données fictives. Configurez Microsoft 365 pour envoyer de vraies invitations.
          </span>
          <button
            onClick={() => {
              resetDemo();
              window.location.reload();
            }}
            className="ml-1 hidden items-center gap-1 rounded-full bg-white/20 px-2 py-0.5 hover:bg-white/30 sm:inline-flex"
          >
            <RotateCcw className="size-3" /> Réinitialiser
          </button>
        </div>
      )}

      <header className="sticky top-0 z-30 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl dark:border-white/[0.06] dark:bg-[#0a0b14]/70">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
          <a href={hrefFor("book")} className="flex items-center gap-2.5" aria-label="Accueil">
            <Logo className="size-9" />
            <div className="hidden leading-tight sm:block">
              <p className="text-[15px] font-bold tracking-tight">{config.appName}</p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{config.companyName}</p>
            </div>
          </a>

          <nav
            className="mx-auto hidden items-center gap-1 rounded-2xl bg-slate-900/[0.04] p-1 md:flex dark:bg-white/[0.05]"
            aria-label="Navigation principale"
          >
            {NAV.map(({ view: v, label, icon: Icon }) => {
              const active = view === v;
              return (
                <a
                  key={v}
                  href={hrefFor(v)}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex h-9 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
                    active
                      ? "text-slate-900 dark:text-white"
                      : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white",
                  )}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-pill"
                      className="absolute inset-0 rounded-xl bg-white shadow-sm dark:bg-white/10"
                      transition={{ type: "spring", damping: 30, stiffness: 400 }}
                    />
                  )}
                  <Icon className="relative size-4" />
                  <span className="relative">{label}</span>
                  {v === "bookings" && upcoming > 0 && (
                    <span className="bg-brand-gradient relative rounded-full px-1.5 text-[11px] leading-[18px] text-white">{upcoming}</span>
                  )}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-1.5 md:ml-0">
            {!embedded && (
              <button
                onClick={onToggleTheme}
                className="flex size-10 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-slate-900/5 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-white"
                aria-label={theme === "dark" ? "Passer en thème clair" : "Passer en thème sombre"}
              >
                <motion.span key={theme} initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }}>
                  {theme === "dark" ? <Sun className="size-5" /> : <Moon className="size-5" />}
                </motion.span>
              </button>
            )}
            <UserMenu onSignOut={embedded ? undefined : onSignOut} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 pt-6 pb-28 sm:px-6 sm:pt-8 md:pb-12">{children}</main>

      {/* Barre de navigation mobile */}
      <nav
        className="fixed inset-x-3 bottom-3 z-30 flex items-center justify-around rounded-3xl border border-slate-200/70 bg-white/85 p-1.5 shadow-xl shadow-slate-900/10 backdrop-blur-xl md:hidden dark:border-white/10 dark:bg-[#151827]/85"
        style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
        aria-label="Navigation"
      >
        {NAV.map(({ view: v, label, icon: Icon }) => {
          const active = view === v;
          return (
            <button
              key={v}
              onClick={() => navigate(v)}
              className={cn(
                "relative flex flex-1 flex-col items-center gap-0.5 rounded-2xl py-2 text-[11px] font-semibold",
                active ? "text-brand-600 dark:text-brand-300" : "text-slate-500",
              )}
            >
              {active && <motion.span layoutId="mobile-pill" className="absolute inset-0 rounded-2xl bg-brand-500/10" />}
              <span className="relative">
                <Icon className="size-5" />
                {v === "bookings" && upcoming > 0 && (
                  <span className="bg-brand-gradient absolute -top-1.5 -right-2.5 rounded-full px-1 text-[10px] leading-4 text-white">
                    {upcoming}
                  </span>
                )}
              </span>
              <span className="relative">{label === "Mes réservations" ? "Mes résas" : label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function UserMenu({ onSignOut }: { onSignOut?: () => void }) {
  const { data: me } = useMe();
  if (!me) return <div className="skeleton size-9 rounded-full" />;
  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button className="rounded-full transition-transform hover:scale-105" aria-label="Mon compte">
          <Avatar name={me.name} email={config.demo ? me.email : "me"} size={36} />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="data-[state=open]:animate-pop z-50 w-64 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-white/10 dark:bg-[#151827]"
        >
          <div className="flex items-center gap-3 px-2.5 py-2.5">
            <Avatar name={me.name} email={config.demo ? me.email : "me"} size={40} />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{me.name}</p>
              <p className="truncate text-xs text-slate-500">{me.email}</p>
            </div>
          </div>
          {onSignOut && (
            <>
              <DropdownMenu.Separator className="my-1 h-px bg-slate-100 dark:bg-white/10" />
              <DropdownMenu.Item
                onSelect={onSignOut}
                className="flex cursor-pointer items-center gap-2 rounded-xl px-2.5 py-2 text-sm text-slate-700 outline-none data-[highlighted]:bg-slate-100 dark:text-slate-200 dark:data-[highlighted]:bg-white/10"
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
