import { addDays, startOfDay } from "date-fns";
import { beforeEach, describe, expect, it } from "vitest";
import { DemoBookingService, resetDemo } from "./demoService";
import { fromGraphDate, toGraphLocal } from "./graph";
import { buildInvitationBody } from "./invitation";

describe("dates Graph", () => {
  it("relit les dates Graph (7 décimales, sans Z) comme de l'UTC", () => {
    expect(fromGraphDate({ dateTime: "2030-01-07T13:00:00.0000000", timeZone: "UTC" }).toISOString()).toBe("2030-01-07T13:00:00.000Z");
  });

  it("écrit l'heure murale locale avec le fuseau IANA", () => {
    const value = toGraphLocal(new Date(2030, 0, 7, 15, 30));
    expect(value.dateTime).toBe("2030-01-07T15:30:00");
    expect(value.timeZone).toBeTruthy();
  });
});

describe("invitation", () => {
  it("échappe le HTML du message", () => {
    const html = buildInvitationBody({
      resource: { id: "a", email: "a@x.com", kind: "room", name: "Everest", features: [], building: "Siège" },
      start: new Date(),
      end: new Date(),
      subject: "Test",
      attendees: [],
      teamsMeeting: true,
      message: "<script>alert(1)</script>",
    });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Everest");
  });
});

describe("DemoBookingService", () => {
  beforeEach(() => resetDemo());

  it("réserve, refuse le doublon puis annule", async () => {
    const service = new DemoBookingService();
    const [room] = await service.listResources("room");
    const day = addDays(startOfDay(new Date()), 30);
    const map = await service.getAvailability([room.email], day, addDays(day, 1));
    const free = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      .map((h) => new Date(day.getTime() + h * 3600_000))
      .find((s) => !map[room.id].busy.some((b) => b.start < new Date(s.getTime() + 3600_000) && s < b.end))!;
    const end = new Date(free.getTime() + 3600_000);

    const booking = await service.createBooking({ resource: room, start: free, end, subject: "Démo", attendees: [], teamsMeeting: true });
    expect(booking.teamsJoinUrl).toBeTruthy();

    await expect(
      service.createBooking({ resource: room, start: free, end, subject: "Doublon", attendees: [], teamsMeeting: false }),
    ).rejects.toThrow(/vient d'être réservé/);

    const list = await service.listMyBookings(day, addDays(day, 1));
    expect(list.some((b) => b.id === booking.id)).toBe(true);

    await service.cancelBooking(booking);
    expect((await service.listMyBookings(day, addDays(day, 1))).some((b) => b.id === booking.id)).toBe(false);
  }, 15_000);

  it("deux réservations simultanées du même créneau : une seule réussit", async () => {
    const service = new DemoBookingService();
    const [room] = await service.listResources("room");
    const day = addDays(startOfDay(new Date()), 40);
    const map = await service.getAvailability([room.email], day, addDays(day, 1));
    const start = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]
      .map((h) => new Date(day.getTime() + h * 3600_000))
      .find((s) => !map[room.id].busy.some((b) => b.start < new Date(s.getTime() + 3600_000) && s < b.end))!;
    const req = { resource: room, start, end: new Date(start.getTime() + 3600_000), subject: "Course", attendees: [], teamsMeeting: false };
    const results = await Promise.allSettled([service.createBooking(req), service.createBooking(req)]);
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status === "rejected")).toHaveLength(1);
  }, 15_000);

  it("accueil : remise puis retour des clés d'un véhicule", async () => {
    const service = new DemoBookingService();
    const [vehicle] = await service.listResources("vehicle");
    const day = addDays(startOfDay(new Date()), 45);
    const map = await service.getAvailability([vehicle.email], day, addDays(day, 1));
    const start = [8, 9, 10, 11, 12, 13, 14, 15, 16]
      .map((h) => new Date(day.getTime() + h * 3600_000))
      .find((s) => !map[vehicle.id].busy.some((b) => b.start < new Date(s.getTime() + 7200_000) && s < b.end))!;
    const booking = await service.createBooking({
      resource: vehicle,
      start,
      end: new Date(start.getTime() + 7200_000),
      subject: "Client",
      attendees: [],
      teamsMeeting: false,
    });

    const list = await service.listVehicleBookings(day, addDays(day, 1));
    const vb = list.find((b) => b.id === booking.id)!;
    expect(vb.keyLog).toEqual({});
    await service.updateKeyLog(vb, { handedAt: new Date().toISOString(), startKm: 100 });
    const after = (await service.listVehicleBookings(day, addDays(day, 1))).find((b) => b.id === booking.id)!;
    expect(after.keyLog.startKm).toBe(100);
  }, 15_000);

  it("produit des disponibilités déterministes", async () => {
    const service = new DemoBookingService();
    const [room] = await service.listResources("room");
    const day = addDays(startOfDay(new Date()), 10);
    const a = await service.getAvailability([room.email], day, addDays(day, 1));
    const b = await service.getAvailability([room.email], day, addDays(day, 1));
    expect(a[room.id].busy.map((s) => s.start.getTime())).toEqual(b[room.id].busy.map((s) => s.start.getTime()));
  }, 10_000);
});
