import type { QueryResultRow } from "pg";
import type { VisitaAprobacionDecision } from "./dto/update-visita-aprobacion.dto";

export interface VisitaAprobacionNotificacionRow extends QueryResultRow {
  id: string;
  grupo_decision_id: string;
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
  grupoDecisionId: number;
  visitaId: number;
  estadoAprobacion: VisitaAprobacionDecision;
  motivoRechazo: string | null;
  visitante: string;
  sedeNombre: string;
  createdAt: string;
}

export interface VisitaAprobacionConfirmacionDto {
  id: number;
  grupoDecisionId: number;
  confirmed: true;
}

export interface VisitaAprobacionConfirmacionRow {
  grupoDecisionId: number;
  destinatarioIds: number[];
}

export interface VisitaAprobacionConfirmadaNotificacionDto {
  grupoDecisionId: number;
}

export interface VisitaCorreoFallidaNotificacionDto {
  visitaId: number;
  mensaje: string;
  createdAt: string;
}

export type VisitaNotificacionEnVivo =
  | { type: "visita.aprobacion"; data: VisitaAprobacionNotificacionDto }
  | { type: "visita.aprobacion-confirmada"; data: VisitaAprobacionConfirmadaNotificacionDto }
  | { type: "visita.correo-fallido"; data: VisitaCorreoFallidaNotificacionDto };
