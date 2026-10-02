import { Accessibility, Gauge, Leaf, Monitor, Navigation, Phone, Presentation, Truck, Video, Zap, type LucideIcon } from "lucide-react";
import type { Feature, ResourceKind } from "../types";

export const FEATURES: Record<Feature, { label: string; icon: LucideIcon }> = {
  screen: { label: "Écran", icon: Monitor },
  video: { label: "Visio", icon: Video },
  whiteboard: { label: "Tableau blanc", icon: Presentation },
  phone: { label: "Audio", icon: Phone },
  accessible: { label: "Accès PMR", icon: Accessibility },
  electric: { label: "Électrique", icon: Zap },
  hybrid: { label: "Hybride", icon: Leaf },
  automatic: { label: "Boîte auto", icon: Gauge },
  utility: { label: "Utilitaire", icon: Truck },
  gps: { label: "GPS", icon: Navigation },
};

export const FILTERABLE: Record<ResourceKind, Feature[]> = {
  room: ["video", "screen", "whiteboard", "accessible"],
  vehicle: ["electric", "hybrid", "automatic", "utility"],
};

export const KIND_LABEL: Record<ResourceKind, { one: string; many: string; article: string }> = {
  room: { one: "salle", many: "salles", article: "la salle" },
  vehicle: { one: "véhicule", many: "véhicules", article: "le véhicule" },
};
