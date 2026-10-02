export type ResourceKind = "room" | "vehicle";

export type Feature = "screen" | "video" | "whiteboard" | "phone" | "accessible" | "electric" | "hybrid" | "automatic" | "utility" | "gps";

export interface Resource {
  /** Adresse SMTP de la boîte aux lettres de ressource, en minuscules. */
  id: string;
  email: string;
  kind: ResourceKind;
  name: string;
  description?: string;
  /** Nombre de personnes (salle) ou de places (véhicule). */
  capacity?: number;
  building?: string;
  floor?: string;
  features: Feature[];
  image?: string;
  /** Teinte (0-360) utilisée pour l'illustration de la carte. */
  hue?: number;
  // Véhicules
  plate?: string;
  model?: string;
  energy?: string;
  rangeKm?: number;
  location?: string;
}

export type BusyStatus = "busy" | "tentative" | "oof" | "workingElsewhere" | "free" | "unknown";

export interface BusySlot {
  start: Date;
  end: Date;
  status: BusyStatus;
  subject?: string;
  /** Vrai si le créneau a été ajouté localement juste après une réservation. */
  optimistic?: boolean;
}

export interface Availability {
  id: string;
  busy: BusySlot[];
  error?: string;
}

export type AvailabilityMap = Record<string, Availability>;

export interface Person {
  id: string;
  name: string;
  email: string;
  jobTitle?: string;
  department?: string;
  isGroup?: boolean;
  isExternal?: boolean;
}

export interface CurrentUser {
  id: string;
  name: string;
  givenName?: string;
  email: string;
  jobTitle?: string;
}

export interface BookingRequest {
  resource: Resource;
  start: Date;
  end: Date;
  subject: string;
  attendees: Person[];
  message?: string;
  teamsMeeting: boolean;
}

export type ResponseStatus = "accepted" | "declined" | "tentativelyAccepted" | "none" | "notResponded" | "organizer";

export interface BookingAttendee extends Person {
  status: ResponseStatus;
}

export interface Booking {
  id: string;
  subject: string;
  start: Date;
  end: Date;
  resource?: Resource;
  resourceEmail?: string;
  resourceName?: string;
  resourceStatus: ResponseStatus;
  attendees: BookingAttendee[];
  organizer?: Person;
  isOrganizer: boolean;
  isCancelled: boolean;
  teamsJoinUrl?: string;
  webLink?: string;
  bodyPreview?: string;
}

export interface BookingService {
  readonly mode: "demo" | "m365";
  getCurrentUser(): Promise<CurrentUser>;
  /** URL (object URL ou data URL) de la photo de profil, ou null. */
  getPhoto(email: string | "me"): Promise<string | null>;
  listResources(kind: ResourceKind): Promise<Resource[]>;
  getAvailability(emails: string[], from: Date, to: Date): Promise<AvailabilityMap>;
  suggestPeople(): Promise<Person[]>;
  searchPeople(query: string): Promise<Person[]>;
  createBooking(request: BookingRequest): Promise<Booking>;
  listMyBookings(from: Date, to: Date): Promise<Booking[]>;
  cancelBooking(booking: Booking, comment?: string): Promise<void>;
}
