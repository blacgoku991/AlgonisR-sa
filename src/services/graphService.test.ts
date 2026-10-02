import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Resource } from "../types";

vi.mock("./auth", () => ({ getAccessToken: vi.fn(async () => "jeton-test") }));

const { GraphBookingService } = await import("./graphService");

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
  it("crée l'événement avec la salle en ressource, les invités et la réunion Teams", async () => {
    responder = (call) => ({
      id: "evt1",
      subject: call.body.subject,
      start: { dateTime: "2030-01-07T14:00:00.0000000", timeZone: "UTC" },
      end: { dateTime: "2030-01-07T15:00:00.0000000", timeZone: "UTC" },
      isOrganizer: true,
      webLink: "https://outlook.office365.com/owa/?itemid=evt1",
      onlineMeeting: { joinUrl: "https://teams.microsoft.com/l/meetup-join/abc" },
      attendees: [
        { type: "required", emailAddress: { address: "lea@contoso.com", name: "Léa" }, status: { response: "none" } },
        { type: "resource", emailAddress: { address: room.email, name: room.name }, status: { response: "none" } },
      ],
    });

    const service = new GraphBookingService();
    const booking = await service.createBooking({
      resource: room,
      start: new Date("2030-01-07T14:00:00Z"),
      end: new Date("2030-01-07T15:00:00Z"),
      subject: "Comité",
      attendees: [{ id: "lea", name: "Léa", email: "lea@contoso.com" }],
      teamsMeeting: true,
    });

    const [call] = calls;
    expect(call.method).toBe("POST");
    expect(call.url).toBe("https://graph.microsoft.com/v1.0/me/events");
    expect(call.headers.Authorization).toBe("Bearer jeton-test");
    expect(call.headers.Prefer).toContain("UTC");
    expect(call.body.isOnlineMeeting).toBe(true);
    expect(call.body.onlineMeetingProvider).toBe("teamsForBusiness");
    expect(call.body.transactionId).toBeTruthy();
    expect(call.body.location).toMatchObject({ locationEmailAddress: room.email, locationType: "conferenceRoom" });
    expect(call.body.attendees).toEqual([
      { emailAddress: { address: "lea@contoso.com", name: "Léa" }, type: "required" },
      { emailAddress: { address: room.email, name: "Everest" }, type: "resource" },
    ]);

    expect(booking.teamsJoinUrl).toContain("teams.microsoft.com");
    expect(booking.resource?.id).toBe(room.id);
    expect(booking.attendees.map((a) => a.email)).toEqual(["lea@contoso.com"]);
  });

  it("n'ajoute pas de réunion Teams si l'option est désactivée", async () => {
    responder = () => ({
      id: "e",
      subject: "s",
      start: { dateTime: "2030-01-07T14:00:00", timeZone: "UTC" },
      end: { dateTime: "2030-01-07T15:00:00", timeZone: "UTC" },
    });
    await new GraphBookingService().createBooking({
      resource: room,
      start: new Date(),
      end: new Date(),
      subject: "s",
      attendees: [],
      teamsMeeting: false,
    });
    expect(calls[0].body.isOnlineMeeting).toBe(false);
    expect(calls[0].body.onlineMeetingProvider).toBeUndefined();
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
