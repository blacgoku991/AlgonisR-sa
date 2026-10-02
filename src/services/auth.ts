import {
  createNestablePublicClientApplication,
  createStandardPublicClientApplication,
  InteractionRequiredAuthError,
  type AccountInfo,
  type Configuration,
  type IPublicClientApplication,
} from "@azure/msal-browser";
import { config, graphScopes } from "../config";
import { initHost, type HostInfo } from "./host";

let pca: IPublicClientApplication | null = null;
let host: HostInfo = { kind: "browser", theme: null };

export interface AuthState {
  account: AccountInfo | null;
  host: HostInfo;
}

function msalConfig(): Configuration {
  const origin = window.location.origin;
  return {
    auth: {
      clientId: config.clientId,
      authority: `https://login.microsoftonline.com/${config.tenantId}`,
      // Page « pont » MSAL v5 (redirect.html) — à déclarer comme URI de redirection SPA dans Entra ID.
      redirectUri: `${origin}/redirect.html`,
      postLogoutRedirectUri: `${origin}/`,
    },
    cache: { cacheLocation: "localStorage" },
  };
}

function pickAccount(client: IPublicClientApplication, loginHint?: string): AccountInfo | null {
  const accounts = client.getAllAccounts();
  if (loginHint) {
    const match = accounts.find((a) => a.username.toLowerCase() === loginHint.toLowerCase());
    if (match) return match;
  }
  return client.getActiveAccount() ?? accounts[0] ?? null;
}

/**
 * Initialise l'authentification :
 * - dans Teams / Outlook / Microsoft 365 → Nested App Authentication (SSO, aucune fenêtre de connexion) ;
 * - dans un navigateur → flux de redirection classique Entra ID.
 */
export async function initAuth(): Promise<AuthState> {
  host = config.embedded ? await initHost() : host;

  if (host.kind !== "browser") {
    pca = await createNestablePublicClientApplication(msalConfig());
    let account = pickAccount(pca, host.loginHint);
    if (!account) {
      try {
        const result = await pca.ssoSilent({ scopes: graphScopes, loginHint: host.loginHint });
        account = result.account;
      } catch {
        // Consentement requis : l'utilisateur cliquera sur « Se connecter ».
      }
    }
    if (account) pca.setActiveAccount(account);
    return { account, host };
  }

  pca = await createStandardPublicClientApplication(msalConfig());
  const redirect = await pca.handleRedirectPromise();
  if (redirect?.account) pca.setActiveAccount(redirect.account);
  const account = pickAccount(pca);
  if (account) pca.setActiveAccount(account);
  return { account, host };
}

function client(): IPublicClientApplication {
  if (!pca) throw new Error("L'authentification n'est pas initialisée.");
  return pca;
}

export async function signIn(): Promise<AccountInfo | null> {
  const c = client();
  if (host.kind !== "browser") {
    const result = await c.acquireTokenPopup({ scopes: graphScopes, loginHint: host.loginHint });
    c.setActiveAccount(result.account);
    return result.account;
  }
  await c.loginRedirect({ scopes: graphScopes, prompt: "select_account" });
  return null;
}

export async function signOut(): Promise<void> {
  const c = client();
  const account = c.getActiveAccount();
  if (host.kind !== "browser") return; // Dans Teams/Outlook, la session est celle de l'hôte.
  await c.logoutRedirect({ account, postLogoutRedirectUri: `${window.location.origin}/` });
}

export async function getAccessToken(scopes: string[] = graphScopes): Promise<string> {
  const c = client();
  const account = c.getActiveAccount() ?? pickAccount(c, host.loginHint);
  if (!account) throw new Error("Aucun compte connecté.");
  try {
    const result = await c.acquireTokenSilent({ scopes, account });
    return result.accessToken;
  } catch (error) {
    if (!(error instanceof InteractionRequiredAuthError)) throw error;
    if (host.kind !== "browser") {
      const result = await c.acquireTokenPopup({ scopes, account });
      return result.accessToken;
    }
    await c.acquireTokenRedirect({ scopes, account });
    throw new Error("Redirection vers Microsoft pour renouveler la session…");
  }
}

export function getHost(): HostInfo {
  return host;
}
