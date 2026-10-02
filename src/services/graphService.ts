import type {
  AvailabilityMap,
  Booking,
  BookingAttendee,
  BookingRequest,
  BookingService,
  BusySlot,
  BusyStatus,
  CurrentUser,
  Feature,
  Person,
  Resource,
  ResourceKind,
  ResponseStatus,
} from "../types";
import { entryToResource, floorLabel, hueFor, loadCatalog } from "./catalog";
import { fromGraphDate, graph, graphAll, GraphError, toGraphLocal, toGraphUtc, type GraphDateTime } from "./graph";
import { buildInvitationBody } from "./invitation";

// ── Types Graph (sous-ensemble utile) ────────────────────────

interface GraphRoom {
  id: string;
  emailAddress: string;
  displayName: string;
  capacity?: number | null;
  building?: string | null;
  floorNumber?: number | null;
  floorLabel?: string | null;
  label?: string | null;
  audioDeviceName?: string | null;
  videoDeviceName?: string | null;
  displayDeviceName?: string | null;
  isWheelChairAccessible?: boolean | null;
  tags?: string[] | null;
  bookingType?: string | null;
}

interface GraphScheduleItem {
  status: BusyStatus;
  subject?: string;
  start: GraphDateTime;
  end: GraphDateTime;
}

interface GraphSchedule {
  scheduleId: string;
  scheduleItems?: GraphScheduleItem[];
  error?: { message: string; responseCode: string };
}

interface GraphEmail {
  emailAddress: { address: string; name?: string };
}

interface GraphAttendee extends GraphEmail {
  type: "required" | "optional" | "resource";
  status?: { response: ResponseStatus };
}

interface GraphEvent {
  id: string;
  subject: string;
  bodyPreview?: string;
  start: GraphDateTime;
  end: GraphDateTime;
  isCancelled?: boolean;
  isOrganizer?: boolean;
  webLink?: string;
  organizer?: GraphEmail;
  attendees?: GraphAttendee[];
  location?: { displayName?: string; locationEmailAddress?: string };
  locations?: { displayName?: string; locationEmailAddress?: string }[];
  onlineMeeting?: { joinUrl?: string } | null;
}

interface GraphPerson {
  id: string;
  displayName: string;
  jobTitle?: string | null;
  department?: string | null;
  scoredEmailAddresses?: { address: string }[];
  personType?: { class?: string; subclass?: string };
}

interface GraphUser {
  id: string;
  displayName: string;
  givenName?: string | null;
  mail?: string | null;
  userPrincipalName: string;
  jobTitle?: string | null;
  department?: string | null;
}

const EVENT_FIELDS =
  "id,subject,bodyPreview,start,end,isCancelled,isOrganizer,webLink,organizer,attendees,location,locations,onlineMeeting";

const lower = (s: string) => s.trim().toLowerCase();

function roomFeatures(room: GraphRoom): Feature[] {
  const features: Feature[] = [];
  const tags = (room.tags ?? []).map(lower);
  if (room.displayDeviceName || tags.some((t) => /(ecran|écran|screen|tv|projecteur|projector)/.test(t))) features.push("screen");
  if (room.videoDeviceName || tags.some((t) => /(visio|video|teams|camera)/.test(t))) features.push("video");
  if (tags.some((t) => /(tableau|whiteboard|paperboard)/.test(t))) features.push("whiteboard");
  if (room.audioDeviceName || tags.some((t) => /(audio|phone|téléphone|telephone|pieuvre)/.test(t))) features.push("phone");
  if (room.isWheelChairAccessible || tags.some((t) => /(pmr|accessible)/.test(t))) features.push("accessible");
  return features;
}

function roomToResource(room: GraphRoom): Resource {
  const email = room.emailAddress;
  return {
    id: lower(email),
    email,
    kind: "room",
    name: room.displayName,
    description: room.label ?? undefined,
    capacity: room.capacity ?? undefined,
    building: room.building ?? undefined,
    floor: room.floorLabel ?? floorLabel(room.floorNumber),
    features: roomFeatures(room),
    hue: hueFor(lower(email)),
  };
}

function personFromEmail(e: GraphEmail): Person {
  return { id: lower(e.emailAddress.address), email: e.emailAddress.address, name: e.emailAddress.name || e.emailAddress.address };
}

export class GraphBookingService implements BookingService {
  readonly mode = "m365" as const;
  private resourcesByKind = new Map<ResourceKind, Promise<Resource[]>>();
  private me: Promise<CurrentUser> | null = null;
  private photos = new Map<string, Promise<string | null>>();

  getCurrentUser(): Promise<CurrentUser> {
    this.me ??= graph<GraphUser>("/me?$select=id,displayName,givenName,mail,userPrincipalName,jobTitle").then((u) => ({
      id: u.id,
      name: u.displayName,
      givenName: u.givenName ?? undefined,
      email: u.mail ?? u.userPrincipalName,
      jobTitle: u.jobTitle ?? undefined,
    }));
    return this.me;
  }

  getPhoto(email: string): Promise<string | null> {
    const key = lower(email);
    if (!this.photos.has(key)) {
      const path = key === "me" ? "/me/photos/96x96/$value" : `/users/${encodeURIComponent(key)}/photos/96x96/$value`;
      this.photos.set(
        key,
        graph<Blob>(path, { raw: true })
          .then((blob) => URL.createObjectURL(blob))
          .catch(() => null),
      );
    }
    return this.photos.get(key)!;
  }

  listResources(kind: ResourceKind): Promise<Resource[]> {
    if (!this.resourcesByKind.has(kind)) {
      this.resourcesByKind.set(kind, kind === "room" ? this.loadRooms() : this.loadVehicles());
    }
    return this.resourcesByKind.get(kind)!;
  }

  private async loadRooms(): Promise<Resource[]> {
    const catalog = await loadCatalog();
    const hidden = new Set(catalog.rooms.hide.map(lower));
    const byEmail = new Map<string, Resource>();

    if (catalog.rooms.source !== "catalog") {
      try {
        const rooms = await graphAll<GraphRoom>("/places/microsoft.graph.room?$top=100");
        for (const room of rooms) {
          if (room.bookingType === "reserved") continue;
          const resource = roomToResource(room);
          byEmail.set(resource.id, resource);
        }
      } catch (error) {
        console.warn("Places API indisponible, utilisation du catalogue uniquement.", error);
      }
    }
    if (catalog.rooms.source !== "places") {
      for (const entry of catalog.rooms.items) {
        const id = lower(entry.email);
        byEmail.set(id, entryToResource(entry, "room", byEmail.get(id)));
      }
    } else {
      for (const entry of catalog.rooms.items) {
        const id = lower(entry.email);
        const base = byEmail.get(id);
        if (base) byEmail.set(id, entryToResource(entry, "room", base));
      }
    }
    return [...byEmail.values()].filter((r) => !hidden.has(r.id)).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }

  private async loadVehicles(): Promise<Resource[]> {
    const catalog = await loadCatalog();
    return catalog.vehicles.map((v) => entryToResource(v, "vehicle"));
  }

  async getAvailability(emails: string[], from: Date, to: Date): Promise<AvailabilityMap> {
    const unique = [...new Set(emails.map(lower))];
    const chunks: string[][] = [];
    for (let i = 0; i < unique.length; i += 20) chunks.push(unique.slice(i, i + 20));

    const results = await Promise.all(
      chunks.map((schedules) =>
        graph<{ value: GraphSchedule[] }>("/me/calendar/getSchedule", {
          method: "POST",
          body: { schedules, startTime: toGraphUtc(from), endTime: toGraphUtc(to), availabilityViewInterval: 15 },
        }),
      ),
    );

    const map: AvailabilityMap = {};
    for (const schedule of results.flatMap((r) => r.value)) {
      const id = lower(schedule.scheduleId);
      map[id] = {
        id,
        error: schedule.error?.message,
        busy: (schedule.scheduleItems ?? [])
          .filter((item) => item.status !== "free")
          .map<BusySlot>((item) => ({
            start: fromGraphDate(item.start),
            end: fromGraphDate(item.end),
            status: item.status,
            subject: item.subject || undefined,
          })),
      };
    }
    return map;
  }

  async suggestPeople(): Promise<Person[]> {
    const page = await graph<{ value: GraphPerson[] }>(
      "/me/people?$top=12&$select=id,displayName,jobTitle,department,scoredEmailAddresses,personType",
    );
    return this.mapPeople(page.value).slice(0, 8);
  }

  async searchPeople(query: string): Promise<Person[]> {
    const q = query.replace(/"/g, "").trim();
    if (!q) return [];
    const people = await graph<{ value: GraphPerson[] }>(
      `/me/people?$search="${encodeURIComponent(q)}"&$top=10&$select=id,displayName,jobTitle,department,scoredEmailAddresses,personType`,
    ).then((r) => this.mapPeople(r.value));
    if (people.length > 0) return people;

    // Repli : recherche dans l'annuaire de l'organisation.
    const users = await graph<{ value: GraphUser[] }>(
      `/users?$search="displayName:${encodeURIComponent(q)}" OR "mail:${encodeURIComponent(q)}"&$top=10&$select=id,displayName,mail,userPrincipalName,jobTitle,department`,
      { headers: { ConsistencyLevel: "eventual" } },
    ).catch(() => ({ value: [] as GraphUser[] }));
    return users.value
      .filter((u) => u.mail)
      .map((u) => ({
        id: u.id,
        name: u.displayName,
        email: u.mail!,
        jobTitle: u.jobTitle ?? undefined,
        department: u.department ?? undefined,
      }));
  }

  private mapPeople(items: GraphPerson[]): Person[] {
    return items
      .filter((p) => p.scoredEmailAddresses?.[0]?.address)
      .filter((p) => p.personType?.subclass !== "Room")
      .map((p) => ({
        id: p.id,
        name: p.displayName,
        email: p.scoredEmailAddresses![0].address,
        jobTitle: p.jobTitle ?? undefined,
        department: p.department ?? undefined,
        isGroup: p.personType?.class === "Group",
      }));
  }

  async createBooking(request: BookingRequest): Promise<Booking> {
    const { resource } = request;
    const transactionId = crypto.randomUUID();
    const build = (useUtc: boolean) => ({
      subject: request.subject,
      body: { contentType: "HTML", content: buildInvitationBody(request) },
      start: useUtc ? toGraphUtc(request.start) : toGraphLocal(request.start),
      end: useUtc ? toGraphUtc(request.end) : toGraphLocal(request.end),
      location: {
        displayName: resource.name,
        locationEmailAddress: resource.email,
        locationType: resource.kind === "room" ? "conferenceRoom" : "default",
      },
      attendees: [
        ...request.attendees.map((p) => ({ emailAddress: { address: p.email, name: p.name }, type: "required" })),
        { emailAddress: { address: resource.email, name: resource.name }, type: "resource" },
      ],
      isOnlineMeeting: request.teamsMeeting,
      ...(request.teamsMeeting ? { onlineMeetingProvider: "teamsForBusiness" } : {}),
      allowNewTimeProposals: request.attendees.length > 0,
      responseRequested: true,
      showAs: "busy",
      // Idempotence : un double clic ou une reprise réseau ne crée pas de doublon.
      transactionId,
    });

    let event: GraphEvent;
    try {
      event = await graph<GraphEvent>("/me/events", { method: "POST", body: build(false) });
    } catch (error) {
      // Fuseau IANA refusé par certains locataires : on renvoie les heures en UTC.
      if (error instanceof GraphError && error.status === 400 && /time ?zone/i.test(error.message)) {
        event = await graph<GraphEvent>("/me/events", { method: "POST", body: build(true) });
      } else {
        throw error;
      }
    }
    return this.mapEvent(event, new Map([[resource.id, resource]]));
  }

  async listMyBookings(from: Date, to: Date): Promise<Booking[]> {
    const [rooms, vehicles] = await Promise.all([this.listResources("room"), this.listResources("vehicle")]);
    const known = new Map([...rooms, ...vehicles].map((r) => [r.id, r]));
    const params = new URLSearchParams({
      startDateTime: from.toISOString(),
      endDateTime: to.toISOString(),
      $select: EVENT_FIELDS,
      $orderby: "start/dateTime",
      $top: "100",
    });
    const events = await graphAll<GraphEvent>(`/me/calendarView?${params}`, undefined, 500);
    // « Mes réservations » : événements que j'organise et qui mobilisent une salle ou un véhicule.
    return events.map((e) => this.mapEvent(e, known)).filter((b) => b.isOrganizer && Boolean(b.resourceEmail) && !b.isCancelled);
  }

  private mapEvent(event: GraphEvent, known: Map<string, Resource>): Booking {
    const attendees = event.attendees ?? [];
    const resourceAttendee =
      attendees.find((a) => known.has(lower(a.emailAddress.address))) ?? attendees.find((a) => a.type === "resource");
    const locationEmail = event.location?.locationEmailAddress;
    const resourceEmail =
      resourceAttendee?.emailAddress.address ?? (locationEmail && known.has(lower(locationEmail)) ? locationEmail : undefined);
    const resource = resourceEmail ? known.get(lower(resourceEmail)) : undefined;

    const people: BookingAttendee[] = attendees
      .filter((a) => a !== resourceAttendee && a.type !== "resource")
      .map((a) => ({ ...personFromEmail(a), status: a.status?.response ?? "none" }));

    return {
      id: event.id,
      subject: event.subject || "(Sans objet)",
      start: fromGraphDate(event.start),
      end: fromGraphDate(event.end),
      resource,
      resourceEmail,
      resourceName: resource?.name ?? resourceAttendee?.emailAddress.name ?? event.location?.displayName,
      resourceStatus: resourceAttendee?.status?.response ?? "none",
      attendees: people,
      organizer: event.organizer ? personFromEmail(event.organizer) : undefined,
      isOrganizer: event.isOrganizer ?? true,
      isCancelled: event.isCancelled ?? false,
      teamsJoinUrl: event.onlineMeeting?.joinUrl ?? undefined,
      webLink: event.webLink,
      bodyPreview: event.bodyPreview,
    };
  }

  /** Annule l'événement : la ressource est libérée et les participants reçoivent une annulation. */
  async cancelBooking(booking: Booking, comment?: string): Promise<void> {
    await graph(`/me/events/${encodeURIComponent(booking.id)}/cancel`, { method: "POST", body: { comment: comment ?? "" } });
  }
}
