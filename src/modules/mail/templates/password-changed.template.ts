import { escapeHtml } from "./html-utils";

export const buildPasswordChangedSubject = (): string => "Tu contraseña fue actualizada — Portería";

export function buildPasswordChangedHtml(nombre: string): string {
  return `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#0f172a">
    <h2>Contraseña actualizada</h2>
    <p>Hola ${escapeHtml(nombre)}, te confirmamos que tu contraseña de <strong>Portería</strong> se cambió correctamente.</p>
    <p style="color:#555">Si no realizaste este cambio, contactá de inmediato a tu administrador.</p>
  </body></html>`;
}

export function buildPasswordChangedText(nombre: string): string {
  return [
    `Hola ${nombre}, te confirmamos que tu contraseña de Portería se cambió correctamente.`,
    "Si no realizaste este cambio, contactá de inmediato a tu administrador.",
  ].join("\n");
}
