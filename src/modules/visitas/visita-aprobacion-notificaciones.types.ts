import type { QueryResultRow } from "pg";
import type { VisitaAprobacionDecision } from "./dto/update-visita-aprobacion.dto";

export interface VisitaAprobacionNotificacionRow extends QueryResultRow {
  id: string;
  visita_id: string;
  usuario_destinatario_id: string;
  estado_aprobacion: VisitaAprobacionDecision;
  motivo_rechazo: string | null;
  visitante_nombre: string;
  sede_nombre: string;
  creado_en: Date | string;
  confirmado_en: Date | string | null;
}

export interface VisitaAprobacionNotificacionDto {
  id: number;
  visitaId: number;
  estadoAprobacion: VisitaAprobacionDecision;
  motivoRechazo: string | null;
  visitante: string;
  sedeNombre: string;
  createdAt: string;
}
