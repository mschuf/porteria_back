/**
 * @file visitas.types.ts
 * @description Tipos de fila Postgres e inputs de dominio para el módulo de visitas.
 */
import type { QueryResultRow } from "pg";
import type { VisitaEstado } from "./domain/visita-estado";
import type { VisitaSeguimiento } from "./domain/visita-seguimiento";
import type { VisitaAprobacion } from "./domain/visita-aprobacion";
import type { VisitaSortBy, VisitaSortOrder } from "./dto/list-visitas-query.dto";

/** Fila de la tabla `public.visita` tal como la devuelve Postgres. */
export interface VisitaRow extends QueryResultRow {
  id: string;
  persona_id: string;
  sede_id: string;
  usuario_creador_id: string;
  motivo_visita_id: string | null;
  motivo: string;
  responsable_usuario_id: string;
  estado: VisitaEstado;
  estado_aprobacion: VisitaAprobacion;
  motivo_rechazo: string | null;
  estado_seguimiento: VisitaSeguimiento | null;
  zonas_permitidas: string[] | unknown;
  credencial_numero: string | null;
  tarjeta_color: string | null;
  entrada_at: Date | string | null;
  salida_at: Date | string | null;
  observaciones: string | null;
  creado_en: Date | string;
  actualizado_en: Date | string;
}

/** Fila de foto almacenada en `public.visita`. */
export interface VisitaPhotoRow extends QueryResultRow {
  foto: Buffer;
  foto_mime_type: string | null;
}

/** Fila de visita con datos de persona para listados. */
export interface VisitaListRow extends VisitaRow {
  visitante: string;
  documento: string;
  empresa: string | null;
  sede_nombre: string;
  responsable_nombre: string;
  usuario_creador_nombre: string;
  has_foto: boolean;
  has_visita_foto: boolean;
}

/** Fila del catálogo de tarjetas enriquecida con ocupación por visitas abiertas. */
export interface VisitaTarjetaCandidateRow extends QueryResultRow {
  id: string;
  numero: number;
  sede_id: string;
  sede_nombre: string;
  color: string;
  icono: string;
  areas: Array<{ id: number | string; nombre: string }> | string;
  activo: boolean;
  en_uso: boolean;
  ocupada_por_visita: boolean;
}

/** Filtros de listado paginado de visitas en el repositorio SQL. */
export interface VisitaListFilters {
  page: number;
  limit: number;
  search?: string;
  visitante?: string;
  documento?: string;
  empresa?: string;
  motivo?: string;
  responsable?: string;
  estado?: VisitaEstado;
  estadoAprobacion?: VisitaAprobacion;
  personaId?: number;
  entradaFrom?: string;
  entradaTo?: string;
  includeProgramadasSinEntrada?: boolean;
  sortBy?: VisitaSortBy;
  sortOrder?: VisitaSortOrder;
  sedeIds?: number[];
  sede?: string;
  creador?: string;
}

/** Payload de creación de visita normalizado para el repositorio. */
export interface CreateVisitaInput {
  personaId: number;
  sedeId: number;
  usuarioCreadorId: number;
  motivoVisitaId: number;
  motivo: string;
  responsableUsuarioId: number;
  estado: VisitaEstado;
  estadoAprobacion: VisitaAprobacion;
  motivoRechazo: string | null;
  estadoSeguimiento: VisitaSeguimiento | null;
  zonasPermitidas: string[];
  credencialNumero: string | null;
  tarjetaColor: string | null;
  entradaAt: Date | null;
  salidaAt: Date | null;
  observaciones: string | null;
}

/** Parámetros de rango para agregados de métricas de visitas. */
export interface VisitaMetricsRange {
  entradaFrom: Date;
  entradaTo: Date;
  lastDayStart: Date;
}

/** Fila de agregados de métricas de visitas desde Postgres. */
export interface VisitaMetricsRow extends QueryResultRow {
  month_visits: string;
  day_visits: string;
  active_only_admin: string;
  active_only_factory: string;
  active_both_zones: string;
  active_stale_without_checkout: string;
}

/** Payload parcial de actualización de visita para el repositorio. */
export interface UpdateVisitaInput {
  personaId?: number;
  sedeId?: number;
  motivoVisitaId?: number;
  motivo?: string;
  responsableUsuarioId?: number;
  estado?: VisitaEstado;
  estadoAprobacion?: VisitaAprobacion;
  motivoRechazo?: string | null;
  estadoSeguimiento?: VisitaSeguimiento | null;
  zonasPermitidas?: string[];
  credencialNumero?: string | null;
  tarjetaColor?: string | null;
  entradaAt?: Date | null;
  salidaAt?: Date | null;
  observaciones?: string | null;
}

/** Acciones auditables del dominio de visitas. */
export const VISITA_AUDIT_ACTION = [
  "visita.created",
  "visita.updated",
  "visita.closed",
  "visita.deleted",
] as const;

export type VisitaAuditAction = (typeof VISITA_AUDIT_ACTION)[number];

/** Snapshot serializable de visita almacenado en before/after_state del log. */
export interface VisitaAuditSnapshot {
  id: number;
  personaId: number;
  visitante: string;
  documento: string;
  empresa: string | null;
  sedeId: number;
  sedeNombre: string;
  responsableId: number;
  motivo: string;
  responsableNombre: string;
  usuarioCreadorId: number;
  usuarioCreadorNombre: string;
  estado: VisitaEstado;
  estadoAprobacion: VisitaAprobacion;
  motivoRechazo: string | null;
  estadoSeguimiento: VisitaSeguimiento | null;
  zonasPermitidas: string[];
  credencialNumero: string | null;
  tarjetaColor: string | null;
  entradaAt: string | null;
  salidaAt: string | null;
  observaciones: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Payload de inserción de auditoría de visitas. */
export interface CreateVisitaAuditLogInput {
  visitaId: number;
  action: VisitaAuditAction;
  actorUserId: number;
  changedFields: string[];
  beforeState: VisitaAuditSnapshot | null;
  afterState: VisitaAuditSnapshot | null;
  metadata?: Record<string, unknown>;
}

/** Columnas ordenables del reporte de auditoría de portería. */
export const VISITA_AUDIT_SORT_BY = [
  "occurredAt",
  "action",
  "visitante",
  "documento",
  "actorUserId",
  "visitaId",
] as const;

export type VisitaAuditSortBy = (typeof VISITA_AUDIT_SORT_BY)[number];
export type VisitaAuditSortOrder = "asc" | "desc";

/** Filtros paginados para consultar auditoría de visitas. */
export interface VisitaAuditListFilters {
  page: number;
  limit: number;
  q?: string;
  action?: VisitaAuditAction;
  actorUserId?: number;
  visitaId?: number;
  visitante?: string;
  documento?: string;
  occurredFrom?: string;
  occurredTo?: string;
  estadoBefore?: VisitaEstado;
  estadoAfter?: VisitaEstado;
  sortBy?: VisitaAuditSortBy;
  sortOrder?: VisitaAuditSortOrder;
  sedeIds?: number[];
}

/** Fila SQL de `public.prt_visita_audit_log` para listados. */
export interface VisitaAuditLogRow extends QueryResultRow {
  id: string;
  visita_id: string;
  action: VisitaAuditAction;
  actor_user_id: string;
  occurred_at: Date | string;
  before_state: VisitaAuditSnapshot | null;
  after_state: VisitaAuditSnapshot | null;
  changed_fields: string[] | null;
  metadata: Record<string, unknown> | null;
  visitante: string | null;
  documento: string | null;
  estado_before: VisitaEstado | null;
  estado_after: VisitaEstado | null;
}
