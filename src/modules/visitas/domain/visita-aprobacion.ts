/** Estados de aprobación usados exclusivamente por responsables de visita. */
export const VISITA_APROBACION = ["pendiente", "aprobada", "rechazada", "cancelada"] as const;
export type VisitaAprobacion = (typeof VISITA_APROBACION)[number];
