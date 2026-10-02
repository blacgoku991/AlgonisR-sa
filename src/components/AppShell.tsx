import { CalendarCheck, CalendarPlus, ChartGantt, KeyRound, LogOut, Moon, RotateCcw, Sun } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import type { ReactNode } from "react";
import { config } from "../config";
import { useMe, useMyBookings, useRole } from "../hooks/queries";
import { cn } from "../lib/cn";
import { fmtRelativeDay, fmtTime } from "../lib/time";
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
const RECEPTION: NavItem = { view: "reception", label: "Accueil · clés", short: "Accueil", icon: KeyRound };

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
    <div className="flex min-h-dvh">
      {/* Barre latérale (bureau) */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-zinc-200 bg-zinc-50/60 lg:flex dark:border-white/[0.07] dark:bg-[#0e0e10]">
        <a href={hrefFor("book")} className="flex h-14 items-center gap-2.5 px-5" aria-label="Accueil">
          <Logo className="size-7" />
          <span className="min-w-0 leading-tight">
            <span className="block text-sm font-semibold tracking-tight">{config.appName}</span>
            <span className="block truncate text-[11px] text-zinc-500">{config.companyName}</span>
          </span>
        </a>

        <nav className="mt-2 flex flex-col gap-0.5 px-3" aria-label="Navigation principale">
          {items.map((item, i) => (
            <div key={item.view}>
              {item.view === "reception" && i > 0 && (
                <p className="mt-5 mb-1.5 px-2.5 text-[11px] font-medium tracking-wide text-zinc-400 uppercase">Équipe</p>
              )}
              <SideLink item={item} active={view === item.view} badge={item.view === "bookings" ? upcoming : 0} />
            </div>
          ))}
        </nav>

        <div className="mt-auto space-y-3 p-3">
          <NextBookingMini />
          <div className="flex items-center gap-1 border-t border-zinc-200 pt-3 dark:border-white/[0.07]">
            <UserMenu onSignOut={embedded ? undefined : onSignOut} />
            {!embedded && <ThemeButton theme={theme} onToggle={onToggleTheme} />}
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {config.demo && (
          <div className="flex items-center justify-center gap-3 border-b border-amber-500/20 bg-amber-500/[0.07] px-4 py-1.5 text-center text-xs text-amber-800 dark:text-amber-200/90">
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

        {/* En-tête (mobile / tablette) */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur lg:hidden dark:border-white/[0.07] dark:bg-[#0c0c0e]/95">
          <Logo className="size-7" />
          <span className="text-sm font-semibold">{config.appName}</span>
          <div className="ml-auto flex items-center gap-1">
            {!embedded && <ThemeButton theme={theme} onToggle={onToggleTheme} />}
            <UserMenu onSignOut={embedded ? undefined : onSignOut} compact />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:px-8 sm:pt-8 lg:pb-12">{children}</main>
      </div>

      {/* Navigation mobile */}
      <nav
        className="fixed inset-x-0 bottom-0 z-30 flex border-t border-zinc-200 bg-white/95 backdrop-blur lg:hidden dark:border-white/[0.08] dark:bg-[#0c0c0e]/95"
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
              {short}
            </button>
          );
        })}
      </nav>
    </div>
  );
}

function SideLink({ item, active, badge }: { item: NavItem; active: boolean; badge: number }) {
  const Icon = item.icon;
  return (
    <a
      href={hrefFor(item.view)}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex h-9 items-center gap-2.5 rounded-md px-2.5 text-sm transition-colors",
        active
          ? "bg-white font-medium text-zinc-900 shadow-sm ring-1 ring-zinc-200 dark:bg-white/[0.07] dark:text-white dark:shadow-none dark:ring-white/[0.06]"
          : "text-zinc-600 hover:bg-zinc-200/50 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.04] dark:hover:text-zinc-100",
      )}
    >
      <Icon className="size-4" strokeWidth={1.8} />
      {item.label}
      {badge > 0 && <span className="ml-auto text-xs text-zinc-500 tabular-nums">{badge}</span>}
    </a>
  );
}

function NextBookingMini() {
  const { data } = useMyBookings();
  const now = new Date();
  const next = data?.find((b) => b.end > now);
  if (!next) return null;
  return (
    <button
      onClick={() => navigate("bookings")}
      className="w-full rounded-lg border border-zinc-200 bg-white p-3 text-left transition-colors hover:border-zinc-300 dark:border-white/[0.07] dark:bg-white/[0.03] dark:hover:border-white/15"
    >
      <p className="text-[11px] text-zinc-500">{now >= next.start ? "En cours" : "Prochaine réservation"}</p>
      <p className="mt-0.5 truncate text-[13px] font-medium">{next.subject}</p>
      <p className="truncate text-xs text-zinc-500">
        {fmtRelativeDay(next.start)} · {fmtTime(next.start)} · {next.resourceName}
      </p>
    </button>
  );
}

function ThemeButton({ theme, onToggle }: { theme: "light" | "dark"; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex size-9 shrink-0 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-zinc-200/60 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-white/[0.06] dark:hover:text-white"
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
            "flex min-w-0 items-center gap-2.5 rounded-md text-left transition-colors hover:bg-zinc-200/60 dark:hover:bg-white/[0.06]",
            compact ? "p-1" : "h-11 flex-1 px-2",
          )}
          aria-label="Mon compte"
        >
          <Avatar name={me.name} email={email} size={compact ? 28 : 26} />
          {!compact && (
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-[13px] font-medium">{me.name}</span>
              <span className="block truncate text-[11px] text-zinc-500">{me.jobTitle ?? me.email}</span>
            </span>
          )}
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={compact ? "end" : "start"}
          side={compact ? "bottom" : "top"}
          sideOffset={8}
          className="data-[state=open]:animate-pop z-50 w-60 rounded-lg border border-zinc-200 bg-white p-1 shadow-lg dark:border-white/10 dark:bg-[#161618]"
        >
          <div className="px-2.5 py-2">
            <p className="truncate text-sm font-medium">{me.name}</p>
            <p className="truncate text-xs text-zinc-500">{me.email}</p>
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
