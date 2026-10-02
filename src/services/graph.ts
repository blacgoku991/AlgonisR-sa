import { getAccessToken } from "./auth";

const GRAPH_URL = "https://graph.microsoft.com/v1.0";

export class GraphError extends Error {
  readonly status: number;
  readonly code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "GraphError";
    this.status = status;
    this.code = code;
  }
}

interface GraphRequest {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  /** Renvoie le corps brut (Blob) au lieu du JSON. */
  raw?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Appel Microsoft Graph authentifié, avec reprise automatique sur 429 / 503 / 504. */
export async function graph<T>(path: string, request: GraphRequest = {}): Promise<T> {
  const url = path.startsWith("https://") ? path : `${GRAPH_URL}${path}`;
  for (let attempt = 0; ; attempt++) {
    const token = await getAccessToken();
    const response = await fetch(url, {
      method: request.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        // Toutes les dates sont échangées en UTC puis converties localement.
        Prefer: 'outlook.timezone="UTC"',
        ...(request.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...request.headers,
      },
      body: request.body !== undefined ? JSON.stringify(request.body) : undefined,
    });

    if ((response.status === 429 || response.status === 503 || response.status === 504) && attempt < 3) {
      const retryAfter = Number(response.headers.get("Retry-After")) || 2 ** attempt;
      await sleep(Math.min(retryAfter, 10) * 1000);
      continue;
    }

    if (!response.ok) {
      let code = String(response.status);
      let message = response.statusText;
      try {
        const payload = await response.json();
        code = payload?.error?.code ?? code;
        message = payload?.error?.message ?? message;
      } catch {
        /* corps vide */
      }
      throw new GraphError(response.status, code, message);
    }

    if (request.raw) return (await response.blob()) as T;
    if (response.status === 202 || response.status === 204) return undefined as T;
    const text = await response.text();
    return (text ? JSON.parse(text) : undefined) as T;
  }
}

/** Parcourt toutes les pages d'une collection Graph (@odata.nextLink). */
export async function graphAll<T>(path: string, headers?: Record<string, string>, max = 2000): Promise<T[]> {
  const items: T[] = [];
  let next: string | undefined = path;
  while (next && items.length < max) {
    const page: { value: T[]; "@odata.nextLink"?: string } = await graph(next, { headers });
    items.push(...page.value);
    next = page["@odata.nextLink"];
  }
  return items;
}

export interface GraphDateTime {
  dateTime: string;
  timeZone: string;
}

/** Les réponses sont demandées en UTC (en-tête Prefer) : on les relit comme telles. */
export function fromGraphDate(value: GraphDateTime): Date {
  const iso = value.dateTime.replace(/(\.\d{3})\d*$/, "$1");
  return new Date(/[zZ]|[+-]\d\d:\d\d$/.test(iso) ? iso : `${iso}Z`);
}

export function toGraphUtc(date: Date): GraphDateTime {
  return { dateTime: date.toISOString().replace("Z", ""), timeZone: "UTC" };
}

/** Heure « murale » locale + fuseau IANA du navigateur (ex. Europe/Paris). */
export function toGraphLocal(date: Date): GraphDateTime {
  const pad = (n: number) => String(n).padStart(2, "0");
  const wall = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:00`;
  return { dateTime: wall, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC" };
}
