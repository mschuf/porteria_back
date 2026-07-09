/**
 * @file location-id.utils.ts
 * @description Utilidades compartidas para normalizar identificadores de sedes GLPI.
 */

/** Normaliza un ID de sede GLPI a entero positivo o `null`. */
export function normalizeLocationId(locationId: number | null | undefined): number | null {
  if (locationId == null) return null;
  const normalized = Number(locationId);
  return Number.isFinite(normalized) && normalized > 0 ? normalized : null;
}
