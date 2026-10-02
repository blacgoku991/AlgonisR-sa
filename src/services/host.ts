export type HostKind = "browser" | "teams" | "outlook" | "office";

export interface HostInfo {
  kind: HostKind;
  /** Thème de l'hôte Teams : "default", "dark", "contrast"… */
  theme: string | null;
  loginHint?: string;
  onThemeChange?: (handler: (theme: string) => void) => void;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([promise, new Promise<T>((_, reject) => setTimeout(() => reject(new Error("Délai dépassé")), ms))]);
}

/**
 * Initialise TeamsJS lorsque l'application est ouverte dans Teams, Outlook ou Microsoft 365.
 * TeamsJS installe au passage le pont « Nested App Authentication » utilisé par MSAL.
 */
export async function initHost(): Promise<HostInfo> {
  try {
    const { app } = await import("@microsoft/teams-js");
    await withTimeout(app.initialize(), 6000);
    const context = await app.getContext();
    const name = context.app.host.name.toLowerCase();
    const kind: HostKind = name.startsWith("outlook") ? "outlook" : name === "office" ? "office" : "teams";
    void app.notifySuccess();
    return {
      kind,
      theme: context.app.theme ?? null,
      loginHint: context.user?.loginHint,
      onThemeChange: (handler) => app.registerOnThemeChangeHandler(handler),
    };
  } catch (error) {
    console.warn("Hôte Microsoft 365 introuvable, bascule en mode navigateur.", error);
    return { kind: "browser", theme: null };
  }
}
