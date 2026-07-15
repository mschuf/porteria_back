import { escapeHtml } from "./html-utils";

export type VisitaDecision = "aprobada" | "rechazada";

export interface VisitaDecisionTemplateInput {
  creadorNombre: string;
  decision: VisitaDecision;
  visitante: string;
  documento: string;
  sede: string;
  motivo: string;
  responsable: string;
  credencial: string;
  motivoRechazo: string | null;
  visitasUrl: string;
}

export const buildVisitaDecisionSubject = (decision: VisitaDecision): string =>
  decision === "aprobada" ? "Visita aprobada — Portería" : "Visita rechazada — Portería";

export function buildVisitaDecisionHtml(input: VisitaDecisionTemplateInput): string {
  const titulo = input.decision === "aprobada" ? "Visita aprobada" : "Visita rechazada";
  const color = input.decision === "aprobada" ? "#15803d" : "#b91c1c";
  const rechazoRow =
    input.decision === "rechazada" && input.motivoRechazo
      ? `<tr><td style="padding:4px 8px"><strong>Motivo del rechazo</strong></td><td>${escapeHtml(input.motivoRechazo)}</td></tr>`
      : "";
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a">
    <h2 style="color:${color}">${titulo}</h2>
    <p>Hola ${escapeHtml(input.creadorNombre)}, la visita que registraste fue <strong>${escapeHtml(input.decision)}</strong> por ${escapeHtml(input.responsable)}.</p>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 8px"><strong>Visitante</strong></td><td>${escapeHtml(input.visitante)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Documento</strong></td><td>${escapeHtml(input.documento)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Sede</strong></td><td>${escapeHtml(input.sede)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Motivo</strong></td><td>${escapeHtml(input.motivo)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Tarjeta</strong></td><td>${escapeHtml(input.credencial)}</td></tr>
      ${rechazoRow}
    </table>
    <p><a href="${escapeHtml(input.visitasUrl)}">Ver visitas</a></p>
  </body></html>`;
}

export function buildVisitaDecisionText(input: VisitaDecisionTemplateInput): string {
  return [
    `Hola ${input.creadorNombre}, la visita que registraste fue ${input.decision} por ${input.responsable}.`,
    `Visitante: ${input.visitante}`,
    `Documento: ${input.documento}`,
    `Sede: ${input.sede}`,
    `Motivo: ${input.motivo}`,
    `Tarjeta: ${input.credencial}`,
    ...(input.decision === "rechazada" && input.motivoRechazo ? [`Motivo del rechazo: ${input.motivoRechazo}`] : []),
    `Ver visitas: ${input.visitasUrl}`,
  ].join("\n");
}
