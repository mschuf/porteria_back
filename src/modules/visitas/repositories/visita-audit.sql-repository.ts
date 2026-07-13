/**
 * @file visita-audit.sql-repository.ts
 * @description Acceso SQL a `public.prt_visita_audit_log` para inserción y listado paginado.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateVisitaAuditLogInput,
  VisitaAuditListFilters,
  VisitaAuditLogRow,
  VisitaAuditSortBy,
  VisitaAuditSortOrder,
} from "../visitas.types";

const VISITA_AUDIT_SORT_EXPRESSIONS: Record<VisitaAuditSortBy, string> = {
  occurredAt: "l.ocurrido_en",
  action: "l.accion",
  visitante: "COALESCE(l.estado_nuevo->>'visitante', l.estado_anterior->>'visitante', '')",
  documento: "COALESCE(l.estado_nuevo->>'documento', l.estado_anterior->>'documento', '')",
  actorUserId: "l.usuario_actor_id",
  visitaId: "l.visita_id",
};

const VISITA_AUDIT_SELECT_COLUMNS = `
  l.id,
  l.visita_id,
  CASE l.accion
    WHEN 'visita.creada' THEN 'visita.created'
    WHEN 'visita.actualizada' THEN 'visita.updated'
    WHEN 'visita.cerrada' THEN 'visita.closed'
    ELSE 'visita.deleted'
  END AS action,
  l.usuario_actor_id AS actor_user_id,
  l.ocurrido_en AS occurred_at,
  l.estado_anterior AS before_state,
  l.estado_nuevo AS after_state,
  l.campos_modificados AS changed_fields,
  l.metadatos AS metadata,
  COALESCE(l.estado_nuevo->>'visitante', l.estado_anterior->>'visitante') AS visitante,
  COALESCE(l.estado_nuevo->>'documento', l.estado_anterior->>'documento') AS documento,
  l.estado_anterior->>'estado' AS estado_before,
  l.estado_nuevo->>'estado' AS estado_after
`;

/** Repositorio Postgres para registrar y consultar eventos de auditoría de visitas. */
@Injectable()
export class VisitaAuditSqlRepository {
  /** Inyecta servicio Postgres compartido. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Inserta un evento de auditoría de visita.
   * @param input - Evento normalizado a persistir.
   */
  async create(input: CreateVisitaAuditLogInput): Promise<void> {
    await this.postgres.query(
      `INSERT INTO public.visita_auditoria (
          visita_id,
          accion,
          usuario_actor_id,
          estado_anterior,
          estado_nuevo,
          campos_modificados,
          metadatos
       ) VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::text[], $7::jsonb)`,
      [
        input.visitaId,
        ({
          "visita.created": "visita.creada",
          "visita.updated": "visita.actualizada",
          "visita.closed": "visita.cerrada",
          "visita.deleted": "visita.cancelada",
        } as const)[input.action],
        input.actorUserId,
        input.beforeState ? JSON.stringify(input.beforeState) : null,
        input.afterState ? JSON.stringify(input.afterState) : null,
        input.changedFields,
        JSON.stringify(input.metadata ?? {}),
      ],
    );
  }

  /**
   * Lista eventos de auditoría paginados con filtros y orden.
   * @param filters - Filtros de consulta.
   * @returns Resultado paginado de logs.
   */
  async findAll(filters: VisitaAuditListFilters): Promise<PaginatedResult<VisitaAuditLogRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.visita_auditoria l ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<VisitaAuditLogRow>(
      `SELECT ${VISITA_AUDIT_SELECT_COLUMNS}
       FROM public.visita_auditoria l
       ${whereSql}
       ${orderSql}
       LIMIT $${limitParam}
       OFFSET $${offsetParam}`,
      listParams,
    );

    return {
      items,
      total,
      page: filters.page,
      limit: filters.limit,
    };
  }

  /**
   * Construye WHERE parametrizado para filtros de auditoría.
   * @param filters - Filtros solicitados.
   * @returns SQL y parámetros.
   */
  private buildWhereClause(filters: VisitaAuditListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    const addIlike = (sqlExpression: string, value?: string): void => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      params.push(`%${trimmed}%`);
      whereClauses.push(`${sqlExpression} ILIKE $${params.length}`);
    };

    if (filters.action) {
      params.push(({
        "visita.created": "visita.creada",
        "visita.updated": "visita.actualizada",
        "visita.closed": "visita.cerrada",
        "visita.deleted": "visita.cancelada",
      } as const)[filters.action]);
      whereClauses.push(`l.accion = $${params.length}`);
    }

    if (filters.actorUserId !== undefined) {
      params.push(filters.actorUserId);
      whereClauses.push(`l.usuario_actor_id = $${params.length}`);
    }

    if (filters.visitaId !== undefined) {
      params.push(filters.visitaId);
      whereClauses.push(`l.visita_id = $${params.length}`);
    }

    if (filters.occurredFrom) {
      params.push(filters.occurredFrom);
      whereClauses.push(`l.ocurrido_en >= $${params.length}::timestamptz`);
    }

    if (filters.occurredTo) {
      params.push(filters.occurredTo);
      whereClauses.push(`l.ocurrido_en <= $${params.length}::timestamptz`);
    }

    if (filters.estadoBefore) {
      params.push(filters.estadoBefore);
      whereClauses.push(`l.estado_anterior->>'estado' = $${params.length}`);
    }

    if (filters.estadoAfter) {
      params.push(filters.estadoAfter);
      whereClauses.push(`l.estado_nuevo->>'estado' = $${params.length}`);
    }

    addIlike(`COALESCE(l.estado_nuevo->>'visitante', l.estado_anterior->>'visitante', '')`, filters.visitante);
    addIlike(`COALESCE(l.estado_nuevo->>'documento', l.estado_anterior->>'documento', '')`, filters.documento);

    const q = filters.q?.trim();
    if (q) {
      params.push(`%${q}%`);
      whereClauses.push(
        `(l.accion ILIKE $${params.length}
          OR l.visita_id::text ILIKE $${params.length}
          OR l.usuario_actor_id::text ILIKE $${params.length}
          OR COALESCE(l.estado_nuevo->>'visitante', l.estado_anterior->>'visitante', '') ILIKE $${params.length}
          OR COALESCE(l.estado_nuevo->>'documento', l.estado_anterior->>'documento', '') ILIKE $${params.length}
          OR COALESCE(l.estado_nuevo->>'motivo', l.estado_anterior->>'motivo', '') ILIKE $${params.length}
          OR COALESCE(l.estado_nuevo->>'responsableNombre', l.estado_anterior->>'responsableNombre', '') ILIKE $${params.length})`,
      );
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  /**
   * Construye ORDER BY con whitelist de columnas.
   * @param filters - Filtros recibidos.
   * @returns SQL ORDER BY seguro.
   */
  private buildOrderClause(filters: VisitaAuditListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY l.ocurrido_en DESC, l.id DESC";
    }
    const expression = VISITA_AUDIT_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY l.ocurrido_en DESC, l.id DESC";
    }
    const direction: VisitaAuditSortOrder = filters.sortOrder === "asc" ? "asc" : "desc";
    return `ORDER BY ${expression} ${direction.toUpperCase()}, l.id DESC`;
  }
}
