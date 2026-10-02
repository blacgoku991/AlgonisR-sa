import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { Toaster } from "sonner";
import { AppShell } from "./components/AppShell";
import { BookingSheet } from "./components/BookingSheet";
import { Logo } from "./components/ui/Logo";
import { config } from "./config";
import { useTheme } from "./hooks/useTheme";
import { BookingsPage } from "./pages/BookingsPage";
import { BookPage } from "./pages/BookPage";
import { PlanningPage } from "./pages/PlanningPage";
import { SignInPage } from "./pages/SignInPage";
import { useView } from "./router";
import { initAuth, signIn as authSignIn, signOut as authSignOut } from "./services/auth";
import type { HostInfo } from "./services/host";

type AuthStatus = "loading" | "signed-in" | "signed-out";

export function App() {
  const [status, setStatus] = useState<AuthStatus>(config.demo ? "signed-in" : "loading");
  const [host, setHost] = useState<HostInfo | undefined>();
  const [error, setError] = useState<string | null>(null);
  const { theme, toggle } = useTheme(host);

  useEffect(() => {
    if (config.demo) return;
    initAuth()
      .then(({ account, host }) => {
        setHost(host);
        setStatus(account ? "signed-in" : "signed-out");
      })
      .catch((e: unknown) => {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
        setStatus("signed-out");
      });
  }, []);

  const signIn = useCallback(async () => {
    setError(null);
    try {
      const account = await authSignIn();
      if (account) setStatus("signed-in");
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const signOut = useCallback(() => void authSignOut(), []);

  return (
    <>
      <Toaster position="top-center" richColors closeButton theme={theme} toastOptions={{ className: "!rounded-2xl" }} />
      {status === "loading" ? (
        <Splash />
      ) : status === "signed-out" ? (
        <SignInPage onSignIn={signIn} error={error} />
      ) : (
        <AppShell theme={theme} onToggleTheme={toggle} onSignOut={signOut} embedded={Boolean(host && host.kind !== "browser")}>
          <Routes />
          <BookingSheet />
        </AppShell>
      )}
    </>
  );
}

function Routes() {
  const view = useView();
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={view}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        {view === "planning" ? <PlanningPage /> : view === "bookings" ? <BookingsPage /> : <BookPage />}
      </motion.div>
    </AnimatePresence>
  );
}

function Splash() {
  return (
    <div className="ambient flex min-h-dvh flex-col items-center justify-center gap-5">
      <motion.div animate={{ scale: [1, 1.06, 1] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <Logo className="size-16 drop-shadow-[0_12px_30px_rgba(99,102,241,0.45)]" />
      </motion.div>
      <p className="text-sm font-medium text-slate-500">Connexion à Microsoft 365…</p>
    </div>
  );
}
