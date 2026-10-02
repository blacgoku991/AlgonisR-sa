import { useState } from "react";
import { Logo } from "../components/ui/Logo";
import { config } from "../config";

export function SignInPage({ onSignIn, error }: { onSignIn: () => Promise<void>; error?: string | null }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm text-center">
        <Logo className="mx-auto size-12" />
        <h1 className="mt-8 text-4xl font-semibold tracking-[-0.03em]">{config.appName}</h1>
        <p className="mt-2 text-[15px] text-muted">Réservation des salles et véhicules · {config.companyName}</p>

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
          className="mt-10 flex h-12 w-full items-center justify-center gap-3 rounded-full bg-brand-600 text-[15px] font-semibold text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-60"
        >
          <MicrosoftLogo />
          {loading ? "Connexion…" : "Se connecter avec Microsoft 365"}
        </button>

        {error && (
          <p className="mt-4 rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">
            {error}
          </p>
        )}

        <p className="mt-6 text-xs leading-relaxed text-muted">
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
