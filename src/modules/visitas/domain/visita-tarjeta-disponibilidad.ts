/**
 * @file visita-tarjeta-disponibilidad.ts
 * @description Reglas de cuándo una visita reserva o puede dejar ocupada una tarjeta.
 */
import type { VisitaEstado } from "./visita-estado";

/** Estados que reservan una tarjeta del catálogo (`en_uso` / ocupación). */
export const VISITA_ESTADOS_QUE_RESERVAN_TARJETA: readonly VisitaEstado[] = [
  "programada",
  "activa",
];

/** Indica si el estado reserva una tarjeta y exige comprobar disponibilidad. */
export function requiresTarjetaDisponibilidad(estado: VisitaEstado): boolean {
  return estado === "programada" || estado === "activa";
}

/**
 * Indica si el estado puede dejar `tarjetas.en_uso` en true.
 * Incluye `sin_salida` para liberar legado al cancelar o al sincronizar el día.
 */
export function mayHoldTarjetaEnUso(estado: VisitaEstado): boolean {
  return requiresTarjetaDisponibilidad(estado) || estado === "sin_salida";
}
