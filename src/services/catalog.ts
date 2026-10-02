import { config } from "../config";
import type { Feature, Resource, ResourceKind } from "../types";

/**
 * Catalogue `public/catalog.json` : modifiable après déploiement, sans recompiler.
 * - Les salles sont découvertes automatiquement via Microsoft Graph (Places API) ;
 *   le catalogue permet de les compléter (photo, équipements…) ou d'en ajouter / masquer.
 * - Les véhicules (boîtes aux lettres « équipement » Exchange) sont déclarés ici.
 */
export interface CatalogEntry {
  email: string;
  name?: string;
  description?: string;
  capacity?: number;
  building?: string;
  floor?: string;
  features?: Feature[];
  image?: string;
  hue?: number;
  model?: string;
  plate?: string;
  energy?: string;
  rangeKm?: number;
  location?: string;
}

export interface Catalog {
  rooms: {
    /** "places" : Graph uniquement · "catalog" : ce fichier uniquement · "both" (défaut). */
    source: "places" | "catalog" | "both";
    hide: string[];
    items: CatalogEntry[];
  };
  vehicles: CatalogEntry[];
}

const EMPTY: Catalog = { rooms: { source: "both", hide: [], items: [] }, vehicles: [] };

let cached: Promise<Catalog> | null = null;

export function loadCatalog(): Promise<Catalog> {
  cached ??= fetch(config.catalogUrl, { cache: "no-cache" })
    .then((res) => (res.ok ? res.json() : EMPTY))
    .then((raw: Partial<Catalog>) => ({
      rooms: { ...EMPTY.rooms, ...(raw.rooms ?? {}) },
      vehicles: raw.vehicles ?? [],
    }))
    .catch(() => EMPTY);
  return cached;
}

export function hueFor(key: string): number {
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
  // Teintes harmonieuses : indigo → violet → bleu → turquoise → émeraude → ambre.
  const palette = [235, 255, 275, 210, 190, 165, 150, 30, 330];
  return palette[Math.abs(hash) % palette.length];
}

export function entryToResource(entry: CatalogEntry, kind: ResourceKind, base?: Resource): Resource {
  const email = entry.email.trim();
  return {
    ...base,
    id: email.toLowerCase(),
    email,
    kind,
    name: entry.name ?? base?.name ?? email.split("@")[0],
    description: entry.description ?? base?.description,
    capacity: entry.capacity ?? base?.capacity,
    building: entry.building ?? base?.building,
    floor: entry.floor ?? base?.floor,
    features: entry.features ?? base?.features ?? [],
    image: entry.image ?? base?.image,
    hue: entry.hue ?? base?.hue ?? hueFor(email.toLowerCase()),
    model: entry.model ?? base?.model,
    plate: entry.plate ?? base?.plate,
    energy: entry.energy ?? base?.energy,
    rangeKm: entry.rangeKm ?? base?.rangeKm,
    location: entry.location ?? base?.location,
  };
}

export function floorLabel(floor: number | null | undefined): string | undefined {
  if (floor === null || floor === undefined) return undefined;
  if (floor === 0) return "Rez-de-chaussée";
  if (floor < 0) return `Sous-sol ${Math.abs(floor)}`;
  return floor === 1 ? "1er étage" : `${floor}e étage`;
}
