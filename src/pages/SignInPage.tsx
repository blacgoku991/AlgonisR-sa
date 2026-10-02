import { useState } from "react";
import { Logo } from "../components/ui/Logo";
import { config } from "../config";

export function SignInPage({ onSignIn, error }: { onSignIn: () => Promise<void>; error?: string | null }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <Logo className="size-10" />
        <h1 className="mt-6 text-2xl font-semibold tracking-tight">{config.appName}</h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">Réservation des salles et véhicules · {config.companyName}</p>

        <button
          onClick={async () => {
            setLoading(true);
            try {
              await onSignIn();
            } finally {
              setLoading(false);
            }
          }}
          disabled={loading}
          className="mt-8 flex h-11 w-full items-center justify-center gap-3 rounded-lg border border-zinc-300 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 disabled:opacity-60 dark:border-white/15 dark:bg-zinc-900 dark:text-white dark:hover:bg-zinc-800"
        >
          <MicrosoftLogo />
          {loading ? "Connexion…" : "Se connecter avec Microsoft 365"}
        </button>

        {error && (
          <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-zinc-500">
          Utilisez votre compte professionnel. Les réservations sont enregistrées dans votre calendrier Outlook et visibles dans Teams.
        </p>
      </div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-4" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
