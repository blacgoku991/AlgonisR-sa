import { keepPreviousData, useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { addDays, startOfDay } from "date-fns";
import { useEffect, useState } from "react";
import { service } from "../services";
import type { AvailabilityMap, Booking, BookingRequest, Resource, ResourceKind } from "../types";

export const keys = {
  me: ["me"] as const,
  photo: (email: string) => ["photo", email.toLowerCase()] as const,
  resources: (kind: ResourceKind) => ["resources", kind] as const,
  availability: (kind: ResourceKind, from: Date, to: Date) => ["availability", kind, from.getTime(), to.getTime()] as const,
  people: (q: string) => ["people", q] as const,
  peopleAvailability: (emails: string[], from: Date, to: Date) =>
    ["people-availability", [...emails].sort().join(","), from.getTime(), to.getTime()] as const,
  bookings: ["bookings"] as const,
};

export function useMe() {
  return useQuery({ queryKey: keys.me, queryFn: () => service.getCurrentUser(), staleTime: Infinity });
}

export function usePhoto(email: string | undefined) {
  return useQuery({
    queryKey: keys.photo(email ?? ""),
    queryFn: () => service.getPhoto(email!),
    enabled: Boolean(email),
    staleTime: Infinity,
    gcTime: Infinity,
  });
}

export function useResources(kind: ResourceKind) {
  return useQuery({ queryKey: keys.resources(kind), queryFn: () => service.listResources(kind), staleTime: 10 * 60_000 });
}

/** Fenêtre de disponibilités : journée(s) entière(s) couvrant le créneau, pour une navigation fluide sans rechargement. */
export function availabilityWindow(start: Date, end: Date): { from: Date; to: Date } {
  const from = startOfDay(start);
  const to = addDays(startOfDay(new Date(end.getTime() - 1)), 1);
  return { from, to };
}

export function useAvailability(kind: ResourceKind, resources: Resource[] | undefined, from: Date, to: Date) {
  return useQuery({
    queryKey: keys.availability(kind, from, to),
    queryFn: () =>
      service.getAvailability(
        resources!.map((r) => r.email),
        from,
        to,
      ),
    enabled: Boolean(resources && resources.length > 0),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function usePeopleAvailability(emails: string[], start: Date, end: Date) {
  const { from, to } = availabilityWindow(start, end);
  return useQuery({
    queryKey: keys.peopleAvailability(emails, from, to),
    queryFn: () => service.getAvailability(emails, from, to),
    enabled: emails.length > 0,
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useDebounced<T>(value: T, delay = 200): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function usePeopleSearch(query: string) {
  const q = useDebounced(query.trim(), 200);
  return useQuery({
    queryKey: keys.people(q),
    queryFn: () => (q ? service.searchPeople(q) : service.suggestPeople()),
    staleTime: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useMyBookings() {
  return useQuery({
    queryKey: keys.bookings,
    queryFn: () => {
      const from = addDays(startOfDay(new Date()), -1);
      return service.listMyBookings(from, addDays(from, 61));
    },
    staleTime: 30_000,
    refetchInterval: 2 * 60_000,
  });
}

/** Ajoute immédiatement le créneau réservé dans les caches de disponibilités (affichage instantané). */
function addOptimisticSlot(client: QueryClient, booking: Booking, resourceId: string) {
  client.setQueriesData<AvailabilityMap>({ queryKey: ["availability"] }, (map) => {
    if (!map || !map[resourceId]) return map;
    const entry = map[resourceId];
    return {
      ...map,
      [resourceId]: {
        ...entry,
        busy: [...entry.busy, { start: booking.start, end: booking.end, status: "busy", subject: booking.subject, optimistic: true }],
      },
    };
  });
}

export function useCreateBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (request: BookingRequest) => service.createBooking(request),
    onSuccess: (booking, request) => {
      addOptimisticSlot(client, booking, request.resource.id);
      client.setQueryData<Booking[]>(keys.bookings, (list) =>
        list ? [...list, booking].sort((a, b) => a.start.getTime() - b.start.getTime()) : list,
      );
      // La boîte de ressource Exchange traite l'invitation en quelques secondes : on resynchronise ensuite.
      setTimeout(() => {
        void client.invalidateQueries({ queryKey: ["availability"] });
        void client.invalidateQueries({ queryKey: keys.bookings });
      }, 6000);
    },
  });
}

export function useCancelBooking() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ booking, comment }: { booking: Booking; comment?: string }) => service.cancelBooking(booking, comment),
    onSuccess: (_, { booking }) => {
      client.setQueryData<Booking[]>(keys.bookings, (list) => list?.filter((b) => b.id !== booking.id));
      client.setQueriesData<AvailabilityMap>({ queryKey: ["availability"] }, (map) => {
        const id = booking.resourceEmail?.toLowerCase();
        if (!map || !id || !map[id]) return map;
        return {
          ...map,
          [id]: {
            ...map[id],
            busy: map[id].busy.filter((s) => !(s.start.getTime() === booking.start.getTime() && s.end.getTime() === booking.end.getTime())),
          },
        };
      });
      setTimeout(() => void client.invalidateQueries({ queryKey: ["availability"] }), 4000);
    },
  });
}
