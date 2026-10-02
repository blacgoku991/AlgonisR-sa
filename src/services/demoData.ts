import type { Person, Resource } from "../types";

const DOMAIN = "algonisr.demo";

export const DEMO_ME: Person & { givenName: string } = {
  id: "me",
  name: "Camille Martin",
  givenName: "Camille",
  email: `camille.martin@${DOMAIN}`,
  jobTitle: "Cheffe de projet",
};

export const DEMO_ROOMS: Resource[] = [
  {
    name: "Everest",
    capacity: 14,
    building: "Siège",
    floor: "5e étage",
    features: ["screen", "video", "phone", "accessible"],
    hue: 235,
    description: "Salle du conseil, vue panoramique",
  },
  { name: "Mont-Blanc", capacity: 8, building: "Siège", floor: "4e étage", features: ["screen", "video", "whiteboard"], hue: 210 },
  { name: "Kilimandjaro", capacity: 6, building: "Siège", floor: "4e étage", features: ["screen", "whiteboard"], hue: 30 },
  { name: "Atlas", capacity: 10, building: "Siège", floor: "3e étage", features: ["screen", "video", "accessible"], hue: 165 },
  {
    name: "Cervin",
    capacity: 4,
    building: "Siège",
    floor: "3e étage",
    features: ["screen", "video"],
    hue: 275,
    description: "Idéale pour les visios",
  },
  { name: "Fuji", capacity: 2, building: "Siège", floor: "2e étage", features: ["video"], hue: 330, description: "Bulle de concentration" },
  {
    name: "Annapurna",
    capacity: 20,
    building: "Campus Nord",
    floor: "Rez-de-chaussée",
    features: ["screen", "video", "phone", "whiteboard", "accessible"],
    hue: 255,
    description: "Auditorium modulable",
  },
  {
    name: "Aconcagua",
    capacity: 6,
    building: "Campus Nord",
    floor: "1er étage",
    features: ["screen", "whiteboard", "accessible"],
    hue: 190,
  },
  { name: "Denali", capacity: 4, building: "Campus Nord", floor: "1er étage", features: ["screen"], hue: 150 },
].map((r) => {
  const email = `salle.${r.name.toLowerCase().replace(/[^a-z]/g, "")}@${DOMAIN}`;
  return { ...r, id: email, email, kind: "room" as const, features: r.features as Resource["features"] };
});

export const DEMO_VEHICLES: Resource[] = [
  {
    name: "Renault Mégane E-Tech",
    model: "Berline électrique",
    plate: "GH-482-KT",
    capacity: 5,
    energy: "Électrique",
    rangeKm: 450,
    features: ["electric", "automatic", "gps"],
    location: "Parking -1 · Place 12",
    hue: 210,
  },
  {
    name: "Peugeot e-208",
    model: "Citadine électrique",
    plate: "FT-219-PL",
    capacity: 5,
    energy: "Électrique",
    rangeKm: 400,
    features: ["electric", "automatic", "gps"],
    location: "Parking -1 · Place 14",
    hue: 165,
  },
  {
    name: "Toyota Corolla Touring",
    model: "Break hybride",
    plate: "GB-731-AZ",
    capacity: 5,
    energy: "Hybride",
    rangeKm: 900,
    features: ["hybrid", "automatic", "gps"],
    location: "Parking -1 · Place 15",
    hue: 235,
  },
  {
    name: "Renault Kangoo Van",
    model: "Utilitaire 3 m³",
    plate: "EZ-604-RM",
    capacity: 2,
    energy: "Diesel",
    rangeKm: 800,
    features: ["utility", "gps"],
    location: "Cour de livraison",
    hue: 30,
  },
  {
    name: "Citroën SpaceTourer",
    model: "Minibus 9 places",
    plate: "GK-118-VB",
    capacity: 9,
    energy: "Diesel",
    rangeKm: 850,
    features: ["automatic", "gps"],
    location: "Parking -2 · Place 3",
    hue: 275,
  },
].map((v) => {
  const email = `vehicule.${v.plate.toLowerCase().replace(/[^a-z0-9]/g, "")}@${DOMAIN}`;
  return { ...v, id: email, email, kind: "vehicle" as const, features: v.features as Resource["features"] };
});

const PEOPLE: [string, string, string][] = [
  ["Thomas Bernard", "Directeur commercial", "Ventes"],
  ["Léa Dubois", "Responsable RH", "Ressources humaines"],
  ["Hugo Moreau", "Développeur senior", "IT"],
  ["Chloé Laurent", "Designer UX", "Produit"],
  ["Lucas Simon", "Comptable", "Finance"],
  ["Manon Michel", "Chargée de communication", "Marketing"],
  ["Nathan Lefebvre", "Technicien support", "IT"],
  ["Inès Garcia", "Juriste", "Juridique"],
  ["Louis Roux", "Directeur général", "Direction"],
  ["Jade Fournier", "Product Owner", "Produit"],
  ["Gabriel Girard", "Commercial terrain", "Ventes"],
  ["Sarah Bonnet", "Assistante de direction", "Direction"],
  ["Arthur Dupont", "Data analyst", "IT"],
  ["Emma Lambert", "Office manager", "Services généraux"],
  ["Jules Fontaine", "Acheteur", "Achats"],
  ["Alice Rousseau", "Contrôleuse de gestion", "Finance"],
  ["Raphaël Vincent", "Responsable logistique", "Logistique"],
  ["Zoé Muller", "Chargée de recrutement", "Ressources humaines"],
  ["Adam Lefèvre", "Architecte cloud", "IT"],
  ["Lina Faure", "Responsable qualité", "Qualité"],
];

export const DEMO_PEOPLE: Person[] = PEOPLE.map(([name, jobTitle, department]) => {
  const slug = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, ".");
  const email = `${slug}@${DOMAIN}`;
  return { id: email, name, email, jobTitle, department };
});

export const DEMO_GROUPS: Person[] = [
  { id: `equipe.produit@${DOMAIN}`, name: "Équipe Produit", email: `equipe.produit@${DOMAIN}`, isGroup: true },
  { id: `comite.direction@${DOMAIN}`, name: "Comité de direction", email: `comite.direction@${DOMAIN}`, isGroup: true },
];

export const MEETING_SUBJECTS = [
  "Point hebdo",
  "Comité de pilotage",
  "Revue de sprint",
  "Entretien candidat",
  "Démo client",
  "Atelier UX",
  "Formation Excel",
  "Réunion budget",
  "Daily",
  "Rétrospective",
  "Onboarding",
  "Brainstorming",
];

export const TRIP_SUBJECTS = [
  "Visite client — Lyon",
  "Livraison matériel",
  "Rendez-vous fournisseur",
  "Salon professionnel",
  "Navette aéroport",
  "Intervention sur site",
];
