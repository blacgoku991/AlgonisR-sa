import { config } from "../config";
import type { BookingRequest } from "../types";

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

/** Corps HTML de l'invitation Outlook (Teams ajoute ensuite son bloc « Rejoindre la réunion »). */
export function buildInvitationBody(request: BookingRequest): string {
  const { resource } = request;
  const details =
    resource.kind === "room"
      ? [resource.building, resource.floor, resource.capacity ? `${resource.capacity} personnes` : null]
      : [resource.model, resource.plate, resource.location ? `Retrait : ${resource.location}` : null];
  const icon = resource.kind === "room" ? "📍" : "🚗";
  const message = request.message?.trim()
    ? `<p style="margin:0 0 16px;white-space:pre-wrap">${escapeHtml(request.message.trim())}</p>`
    : "";

  return `<div style="font-family:'Segoe UI',system-ui,sans-serif;font-size:14px;color:#1e293b">
${message}<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:separate;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc">
<tr><td style="padding:14px 18px">
<div style="font-size:15px;font-weight:600">${icon} ${escapeHtml(resource.name)}</div>
<div style="color:#64748b;margin-top:4px">${details
    .filter(Boolean)
    .map((d) => escapeHtml(String(d)))
    .join(" · ")}</div>
</td></tr></table>
<p style="color:#94a3b8;font-size:12px;margin-top:16px">Réservé avec ${escapeHtml(config.appName)} · ${escapeHtml(config.companyName)}</p>
</div>`;
}
