import { useSyncExternalStore } from "react";
import type { View } from "./store";

const PATHS: Record<View, string> = { book: "#/", planning: "#/planning", bookings: "#/mes-reservations" };

function current(): View {
  const hash = window.location.hash;
  if (hash.startsWith("#/planning")) return "planning";
  if (hash.startsWith("#/mes-reservations")) return "bookings";
  return "book";
}

function subscribe(callback: () => void) {
  window.addEventListener("hashchange", callback);
  return () => window.removeEventListener("hashchange", callback);
}

/** Navigation par fragment (#/…) : fonctionne sur tout hébergement statique et dans Teams. */
export function useView(): View {
  return useSyncExternalStore(subscribe, current, () => "book");
}

export function navigate(view: View) {
  if (current() === view) return;
  window.location.hash = PATHS[view];
  window.scrollTo({ top: 0, behavior: "smooth" });
}

export function hrefFor(view: View): string {
  return PATHS[view];
}
