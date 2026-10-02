import { CalendarCheck, CarFront, Mail, ShieldCheck, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { Logo } from "../components/ui/Logo";
import { TeamsLogo } from "../components/ui/TeamsLogo";
import { config } from "../config";

const POINTS = [
  { icon: Zap, title: "Disponibilités en temps réel", text: "Salles et véhicules libres en un coup d'œil." },
  { icon: Mail, title: "Invitations Outlook automatiques", text: "Vos invités reçoivent l'invitation dans leur boîte." },
  { icon: CalendarCheck, title: "Calendrier Teams synchronisé", text: "Lien de réunion Teams ajouté en un clic." },
  { icon: CarFront, title: "Flotte de véhicules", text: "Réservez une voiture comme une salle." },
];

export function SignInPage({ onSignIn, error }: { onSignIn: () => Promise<void>; error?: string | null }) {
  const [loading, setLoading] = useState(false);

  return (
    <div className="ambient flex min-h-dvh items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", damping: 26 }}
        className="card grid w-full max-w-5xl overflow-hidden lg:grid-cols-[1.1fr_1fr]"
      >
        <div className="bg-brand-gradient relative overflow-hidden p-8 text-white sm:p-12">
          <div className="absolute -top-24 -right-24 size-72 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-32 -left-16 size-80 rounded-full bg-fuchsia-400/20 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <Logo className="size-11 rounded-2xl ring-2 ring-white/30" />
              <div>
                <p className="text-lg font-bold">{config.appName}</p>
                <p className="text-xs text-white/70">{config.companyName}</p>
              </div>
            </div>
            <h1 className="mt-10 text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
              Réservez une salle ou un véhicule
              <br />
              <span className="text-white/75">en moins de 10 secondes.</span>
            </h1>
            <ul className="mt-10 space-y-5">
              {POINTS.map(({ icon: Icon, title, text }, i) => (
                <motion.li
                  key={title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.15 + i * 0.08 }}
                  className="flex gap-3.5"
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <Icon className="size-5" />
                  </span>
                  <span>
                    <span className="block font-semibold">{title}</span>
                    <span className="block text-sm text-white/70">{text}</span>
                  </span>
                </motion.li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-col justify-center p-8 sm:p-12">
          <h2 className="text-2xl font-bold tracking-tight">Bienvenue 👋</h2>
          <p className="mt-2 text-slate-500 dark:text-slate-400">Connectez-vous avec votre compte professionnel Microsoft 365.</p>

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
            className="mt-8 flex h-13 w-full items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-5 py-3.5 text-[15px] font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-400 hover:shadow-md disabled:opacity-60 dark:border-white/15 dark:bg-white/5 dark:text-white"
          >
            <MicrosoftLogo />
            {loading ? "Connexion…" : "Se connecter avec Microsoft"}
          </button>

          {error && <p className="mt-4 rounded-xl bg-rose-500/10 px-3 py-2 text-sm text-rose-700 dark:text-rose-300">{error}</p>}

          <div className="mt-8 flex items-center gap-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
            <TeamsLogo className="size-9 shrink-0" />
            Aussi disponible directement dans Microsoft Teams et Outlook.
          </div>
          <p className="mt-6 flex items-center gap-2 text-xs text-slate-400">
            <ShieldCheck className="size-4" /> Connexion sécurisée Microsoft Entra ID — aucun mot de passe n'est stocké.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 21 21" className="size-5" aria-hidden>
      <rect x="1" y="1" width="9" height="9" fill="#f25022" />
      <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
      <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
      <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
    </svg>
  );
}
