const env = import.meta.env;

function intEnv(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function readFlag(name: string): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  try {
    if (params.has(name)) {
      const on = params.get(name) !== "0";
      sessionStorage.setItem(`reza.${name}`, on ? "1" : "0");
      return on;
    }
    return sessionStorage.getItem(`reza.${name}`) === "1";
  } catch {
    return params.has(name) && params.get(name) !== "0";
  }
}

const clientId = (env.VITE_AZURE_CLIENT_ID ?? "").trim();

export const config = {
  appName: env.VITE_APP_NAME || "Réza",
  companyName: env.VITE_COMPANY_NAME || "AlgonisR",
  clientId,
  tenantId: (env.VITE_AZURE_TENANT_ID ?? "").trim() || "organizations",
  /** Mode démo : aucune inscription Entra ID configurée, ou `?demo` dans l'URL. */
  demo: !clientId || readFlag("demo"),
  /** Application hébergée dans Teams, Outlook ou l'application Microsoft 365 (`?embed=m365`). */
  embedded: readFlag("embed"),
  dayStartHour: intEnv(env.VITE_DAY_START_HOUR, 7),
  dayEndHour: intEnv(env.VITE_DAY_END_HOUR, 20),
  catalogUrl: "/catalog.json",
} as const;

export const graphScopes = ["User.Read", "User.ReadBasic.All", "People.Read", "Calendars.ReadWrite", "Place.Read.All"];
