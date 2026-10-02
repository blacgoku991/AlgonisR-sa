import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Resource } from "../types";

vi.mock("./auth", () => ({
  getAccessToken: vi.fn(async () => "jeton-test"),
  getIdTokenClaims: vi.fn(() => ({ groups: ["grp-accueil"] })),
}));
vi.stubEnv("VITE_RECEPTION_GROUP_ID", "grp-accueil");

const { GraphBookingService } = await import("./graphService");
const { BookingConflictError } = await import("../lib/rules");

interface Call {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: any;
}

let calls: Call[] = [];
let responder: (call: Call) => unknown;

beforeEach(() => {
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init: RequestInit = {}) => {
      if (url === "/catalog.json") {
        return new Response(JSON.stringify({ vehicles: [{ email: "Vehicule.Clio@contoso.com", name: "Clio" }] }));
      }
      const call: Call = {
        url,
        method: init.method ?? "GET",
        headers: init.headers as Record<string, string>,
        body: init.body ? JSON.parse(String(init.body)) : undefined,
      };
      calls.push(call);
      return new Response(JSON.stringify(responder(call)), { status: 200 });
    }),
  );
});

afterEach(() => vi.unstubAllGlobals());

const room: Resource = { id: "salle.everest@contoso.com", email: "salle.everest@contoso.com", kind: "room", name: "Everest", features: [] };

describe("GraphBookingService", () => {
  const event = (over: Record<string, unknown> = {}) => ({
    id: "evt1",
    subject: "Comité",
    start: { dateTime: "2030-01-07T14:00:00.0000000", timeZone: "UTC" },
    end: { dateTime: "2030-01-07T15:00:00.0000000", timeZone: "UTC" },
    isOrganizer: true,
    webLink: "https://outlook.office365.com/owa/?itemid=evt1",
    onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" },
    ...over,
  });
  const resourceAttendee = (response: string) => ({
    type: "resource",
    emailAddress: { address: room.email, name: room.name },
    status: { response },
  });
  const request = (teamsMeeting = true) => ({
    resource: room,
    start: new Date("2030-01-07T14:00:00Z"),
    end: new Date("2030-01-07T15:00:00Z"),
    subject: "Comité",
    attendees: [{ id: "lea", name: "Léa", email: "lea@contoso.com" }],
    teamsMeeting,
  });

  it("réservation sécurisée : vérifie, bloque la salle, attend sa confirmation, puis invite", async () => {
    responder = (call) => {
      if (call.url.includes("getSchedule")) return { value: [{ scheduleId: room.email, scheduleItems: [] }] };
      if (call.method === "POST") return event({ attendees: [resourceAttendee("none")] });
      if (call.method === "GET") return { attendees: [resourceAttendee("accepted")] };
      if (call.method === "PATCH")
        return event({
          attendees: [{ type: "required", emailAddress: { address: "lea@contoso.com", name: "Léa" } }, resourceAttendee("accepted")],
        });
      return {};
    };
    const steps: string[] = [];
    const booking = await new GraphBookingService().createBooking(request(), (s) => steps.push(s));

    expect(steps).toEqual(["checking", "reserving", "confirming", "inviting"]);
    const [check, create, poll, invite] = calls;
    expect(check.url).toContain("/me/calendar/getSchedule");
    expect(create.method).toBe("POST");
    expect(create.url).toBe("https://graph.microsoft.com/v1.0/me/events");
    expect(create.headers.Authorization).toBe("Bearer jeton-test");
    // Aucun invité tant que la ressource n'a pas confirmé.
    expect(create.body.attendees).toEqual([{ emailAddress: { address: room.email, name: "Everest" }, type: "resource" }]);
    expect(create.body.isOnlineMeeting).toBe(true);
    expect(create.body.onlineMeetingProvider).toBe("teamsForBusiness");
    expect(create.body.transactionId).toBeTruthy();
    expect(create.body.location).toMatchObject({ locationEmailAddress: room.email, locationType: "conferenceRoom" });
    expect(poll.method).toBe("GET");
    expect(invite.method).toBe("PATCH");
    expect(invite.body.attendees).toEqual([
      { emailAddress: { address: "lea@contoso.com", name: "Léa" }, type: "required" },
      { emailAddress: { address: room.email, name: "Everest" }, type: "resource" },
    ]);
    expect(booking.resourceStatus).toBe("accepted");
    expect(booking.teamsJoinUrl).toContain("teams.microsoft.com");
  });

  it("refuse avant toute création si le créneau est déjà pris", async () => {
    responder = () => ({
      value: [
        {
          scheduleId: room.email,
          scheduleItems: [
            {
              status: "busy",
              start: { dateTime: "2030-01-07T14:30:00", timeZone: "UTC" },
              end: { dateTime: "2030-01-07T15:30:00", timeZone: "UTC" },
            },
          ],
        },
      ],
    });
    await expect(new GraphBookingService().createBooking(request())).rejects.toBeInstanceOf(BookingConflictError);
    expect(calls.filter((c) => c.method === "POST" && c.url.endsWith("/me/events"))).toHaveLength(0);
  });

  it("si la salle refuse (réservation simultanée), supprime l'événement sans prévenir les invités", async () => {
    responder = (call) => {
      if (call.url.includes("getSchedule")) return { value: [{ scheduleId: room.email, scheduleItems: [] }] };
      if (call.method === "POST") return event({ attendees: [resourceAttendee("none")] });
      if (call.method === "GET") return { attendees: [resourceAttendee("declined")] };
      return {};
    };
    await expect(new GraphBookingService().createBooking(request())).rejects.toBeInstanceOf(BookingConflictError);
    expect(calls.some((c) => c.method === "DELETE" && c.url.endsWith("/me/events/evt1"))).toBe(true);
    expect(calls.some((c) => c.method === "PATCH")).toBe(false);
  });

  it("n'ajoute pas de réunion Teams si l'option est désactivée", async () => {
    responder = (call) => {
      if (call.url.includes("getSchedule")) return { value: [{ scheduleId: room.email, scheduleItems: [] }] };
      if (call.method === "GET") return { attendees: [resourceAttendee("accepted")] };
      return event();
    };
    await new GraphBookingService().createBooking(request(false));
    const create = calls.find((c) => c.method === "POST" && c.url.endsWith("/me/events"))!;
    expect(create.body.isOnlineMeeting).toBe(false);
    expect(create.body.onlineMeetingProvider).toBeUndefined();
  });

  it("accueil : rôle via le groupe Entra ID, lecture et mise à jour du suivi des clés", async () => {
    responder = (call) => {
      if (call.url.endsWith("/me?$select=id,displayName,givenName,mail,userPrincipalName,jobTitle"))
        return { id: "u", displayName: "Emma", mail: "emma@contoso.com", userPrincipalName: "emma@contoso.com" };
      if (call.url.includes("/calendarView"))
        return {
          value: [
            {
              id: "veh-evt",
              subject: "Camille Martin",
              start: { dateTime: "2030-01-07T08:00:00", timeZone: "UTC" },
              end: { dateTime: "2030-01-07T12:00:00", timeZone: "UTC" },
              organizer: { emailAddress: { address: "camille@contoso.com", name: "Camille Martin" } },
              singleValueExtendedProperties: [
                {
                  id: "String {00020329-0000-0000-c000-000000000046} Name RezaKeyLog",
                  value: '{"handedAt":"2030-01-07T07:55:00Z","startKm":1200}',
                },
              ],
            },
          ],
        };
      if (call.method === "PATCH") return { id: "veh-evt", subject: "Camille Martin" };
      return {};
    };
    const service = new GraphBookingService();
    expect(await service.getRole()).toEqual({ reception: true });

    const [b] = await service.listVehicleBookings(new Date("2030-01-07T00:00:00Z"), new Date("2030-01-08T00:00:00Z"));
    expect(calls.find((c) => c.url.includes("/calendarView"))!.url.toLowerCase()).toContain(
      "/users/vehicule.clio%40contoso.com/calendarview",
    );
    expect(b.organizer?.name).toBe("Camille Martin");
    expect(b.keyLog).toEqual({ handedAt: "2030-01-07T07:55:00Z", startKm: 1200 });

    const updated = await service.updateKeyLog(b, { ...b.keyLog, returnedAt: "2030-01-07T12:05:00Z", endKm: 1290 });
    const patch = calls.find((c) => c.method === "PATCH")!;
    expect(patch.url.toLowerCase()).toContain("/users/vehicule.clio%40contoso.com/events/veh-evt");
    expect(JSON.parse(patch.body.singleValueExtendedProperties[0].value).endKm).toBe(1290);
    expect(updated.keyLog.returnedAt).toBe("2030-01-07T12:05:00Z");
  });

  it("lit les disponibilités via getSchedule et ignore les créneaux libres", async () => {
    responder = () => ({
      value: [
        {
          scheduleId: "Salle.Everest@contoso.com",
          scheduleItems: [
            {
              status: "busy",
              subject: "Point",
              start: { dateTime: "2030-01-07T09:00:00.0000000", timeZone: "UTC" },
              end: { dateTime: "2030-01-07T10:00:00.0000000", timeZone: "UTC" },
            },
            {
              status: "free",
              start: { dateTime: "2030-01-07T11:00:00", timeZone: "UTC" },
              end: { dateTime: "2030-01-07T12:00:00", timeZone: "UTC" },
            },
          ],
        },
        { scheduleId: "inconnue@contoso.com", error: { message: "Mailbox not found", responseCode: "ErrorMailRecipientNotFound" } },
      ],
    });
    const map = await new GraphBookingService().getAvailability(
      [room.email, "inconnue@contoso.com"],
      new Date("2030-01-07T00:00:00Z"),
      new Date("2030-01-08T00:00:00Z"),
    );
    expect(calls[0].url).toContain("/me/calendar/getSchedule");
    expect(calls[0].body.schedules).toEqual([room.email, "inconnue@contoso.com"]);
    expect(map[room.id].busy).toHaveLength(1);
    expect(map[room.id].busy[0].start.toISOString()).toBe("2030-01-07T09:00:00.000Z");
    expect(map["inconnue@contoso.com"].error).toBe("Mailbox not found");
  });

  it("ne liste que les réservations que j'organise avec une ressource connue", async () => {
    responder = (call) => {
      if (call.url.includes("/places/")) return { value: [{ id: "1", emailAddress: room.email, displayName: "Everest", capacity: 14 }] };
      const ev = (id: string, isOrganizer: boolean, resource?: string) => ({
        id,
        subject: id,
        isOrganizer,
        start: { dateTime: "2030-01-07T09:00:00", timeZone: "UTC" },
        end: { dateTime: "2030-01-07T10:00:00", timeZone: "UTC" },
        attendees: resource ? [{ type: "resource", emailAddress: { address: resource }, status: { response: "accepted" } }] : [],
      });
      return {
        value: [
          ev("mienne", true, room.email),
          ev("invité", false, room.email),
          ev("sans-salle", true),
          ev("vehicule", true, "vehicule.clio@contoso.com"),
        ],
      };
    };
    const bookings = await new GraphBookingService().listMyBookings(new Date("2030-01-07T00:00:00Z"), new Date("2030-01-08T00:00:00Z"));
    expect(bookings.map((b) => b.id)).toEqual(["mienne", "vehicule"]);
    expect(bookings[0].resourceStatus).toBe("accepted");
    expect(bookings[1].resource?.kind).toBe("vehicle");
  });

  it("annule en prévenant les participants", async () => {
    responder = () => ({});
    await new GraphBookingService().cancelBooking(
      {
        id: "AAMk=",
        subject: "",
        start: new Date(),
        end: new Date(),
        resourceStatus: "accepted",
        attendees: [],
        isOrganizer: true,
        isCancelled: false,
      },
      "Reportée",
    );
    expect(calls[0].url).toBe("https://graph.microsoft.com/v1.0/me/events/AAMk%3D/cancel");
    expect(calls[0].body).toEqual({ comment: "Reportée" });
  });
});
