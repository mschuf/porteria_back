import { escapeHtml } from "./html-utils";

export const buildPasswordResetAdminSubject = (): string =>
  "Un administrador restableció tu contraseña — Portería";

export function buildPasswordResetAdminHtml(nombre: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a">
    <h2>Contraseña restablecida</h2>
    <p>Hola ${escapeHtml(nombre)}, un administrador restableció tu contraseña de <strong>Portería</strong>.</p>
    <p>Ingresá con la nueva contraseña que te haya proporcionado tu administrador.</p>
    <p style="color:#555">Si no esperabas este cambio, contactá a tu administrador.</p>
  </body></html>`;
}

export function buildPasswordResetAdminText(nombre: string): string {
  return [
    `Hola ${nombre}, un administrador restableció tu contraseña de Portería.`,
    "Ingresá con la nueva contraseña que te haya proporcionado tu administrador.",
    "Si no esperabas este cambio, contactá a tu administrador.",
  ].join("\n");
}
