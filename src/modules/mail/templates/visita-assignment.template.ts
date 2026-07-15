import { escapeHtml } from "./html-utils";

export interface VisitaAssignmentTemplateInput {
  responsableNombre: string;
  visitante: string;
  documento: string;
  sede: string;
  motivo: string;
  fechaHora: string;
  creador: string;
  approvalUrl: string;
}

export const buildVisitaAssignmentSubject = (): string => "Nueva visita asignada — Portería";

export function buildVisitaAssignmentHtml(input: VisitaAssignmentTemplateInput): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a">
    <h2>Nueva visita asignada</h2>
    <p>Hola ${escapeHtml(input.responsableNombre)}, fuiste asignado como responsable de una visita.</p>
    <table style="border-collapse:collapse">
      <tr><td style="padding:4px 8px"><strong>Visitante</strong></td><td>${escapeHtml(input.visitante)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Documento</strong></td><td>${escapeHtml(input.documento)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Sede</strong></td><td>${escapeHtml(input.sede)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Motivo</strong></td><td>${escapeHtml(input.motivo)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Fecha y hora</strong></td><td>${escapeHtml(input.fechaHora)}</td></tr>
      <tr><td style="padding:4px 8px"><strong>Creada por</strong></td><td>${escapeHtml(input.creador)}</td></tr>
    </table>
    <p><a href="${escapeHtml(input.approvalUrl)}">Revisar visita</a></p>
  </body></html>`;
}

export function buildVisitaAssignmentText(input: VisitaAssignmentTemplateInput): string {
  return [
    `Hola ${input.responsableNombre}, fuiste asignado como responsable de una visita.`,
    `Visitante: ${input.visitante}`,
    `Documento: ${input.documento}`,
    `Sede: ${input.sede}`,
    `Motivo: ${input.motivo}`,
    `Fecha y hora: ${input.fechaHora}`,
    `Creada por: ${input.creador}`,
    `Revisar visita: ${input.approvalUrl}`,
  ].join("\n");
}
