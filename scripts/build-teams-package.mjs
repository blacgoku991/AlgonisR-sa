#!/usr/bin/env node
/**
 * Génère le package d'application Teams / Outlook / Microsoft 365 :
 *   teams/build/<nom>-teams.zip  (manifest.json + icônes)
 *
 * Variables lues depuis l'environnement ou .env.local / .env :
 *   APP_PUBLIC_URL, TEAMS_APP_ID, VITE_AZURE_CLIENT_ID, VITE_APP_NAME, VITE_COMPANY_NAME
 */
import { randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync, strToU8 } from "fflate";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(file) {
  const path = join(root, file);
  if (!existsSync(path)) return {};
  const out = {};
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (match) out[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvFile(".env"), ...loadEnvFile(".env.local"), ...process.env };
const fail = (message) => {
  console.error(`\n✖ ${message}\n`);
  process.exit(1);
};

const publicUrl = (env.APP_PUBLIC_URL ?? "").replace(/\/+$/, "");
if (!/^https:\/\/[^/]+/.test(publicUrl))
  fail("APP_PUBLIC_URL doit être l'URL HTTPS publique de l'application (ex. https://reservations.contoso.com).");
if (!env.VITE_AZURE_CLIENT_ID) fail("VITE_AZURE_CLIENT_ID est requis (ID d'application Entra ID).");

let teamsAppId = env.TEAMS_APP_ID;
if (!teamsAppId) {
  teamsAppId = randomUUID();
  console.warn(
    `⚠ TEAMS_APP_ID absent : identifiant généré ${teamsAppId}\n  → Ajoutez TEAMS_APP_ID=${teamsAppId} à .env.local pour conserver le même identifiant lors des mises à jour.`,
  );
}

const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
const appName = env.VITE_APP_NAME || "Réza";
const values = {
  VERSION: pkg.version,
  TEAMS_APP_ID: teamsAppId,
  APP_PUBLIC_URL: publicUrl,
  APP_HOST: new URL(publicUrl).host,
  APP_NAME: appName,
  COMPANY_NAME: env.VITE_COMPANY_NAME || "AlgonisR",
  AZURE_CLIENT_ID: env.VITE_AZURE_CLIENT_ID,
};

const template = readFileSync(join(root, "teams/manifest.template.json"), "utf8");
const manifest = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
  if (!(key in values)) fail(`Variable inconnue dans le manifeste : ${key}`);
  return String(values[key]).replace(/"/g, '\\"');
});
JSON.parse(manifest); // validation syntaxique

const outDir = join(root, "teams/build");
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, "manifest.json"), manifest);

const slug = appName
  .normalize("NFD")
  .replace(/[̀-ͯ]/g, "")
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, "-");
const zipPath = join(outDir, `${slug}-teams.zip`);
writeFileSync(
  zipPath,
  zipSync({
    "manifest.json": strToU8(manifest),
    "color.png": readFileSync(join(root, "teams/color.png")),
    "outline.png": readFileSync(join(root, "teams/outline.png")),
  }),
);

console.log(`✔ Package créé : ${zipPath.replace(root + "/", "")}`);
console.log(
  "  → Teams : Applications › Gérer vos applications › Charger une application (ou Centre d'administration Teams › Applications Teams › Gérer les applications › Charger).",
);
