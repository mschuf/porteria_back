/**
 * @file sede-empresa-porteria.sql-repository.ts
 * @description Acceso SQL a la tabla `public.sede_empresa_porteria` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateSedeEmpresaPorteriaInput,
  SedeEmpresaPorteriaListFilters,
  SedeEmpresaPorteriaRow,
  UpdateSedeEmpresaPorteriaInput,
} from "../sede-empresa-porteria.types";
import type {
  SedeEmpresaPorteriaSortBy,
  SedeEmpresaPorteriaSortOrder,
} from "../dto/list-sede-empresa-porteria-query.dto";

const SEDE_EMPRESA_PORTERIA_SORT_EXPRESSIONS: Record<SedeEmpresaPorteriaSortBy, string> = {
  id: "sep.id",
  sedeId: "sep.sede_id",
  empresaPorteriaId: "sep.empresa_porteria_id",
  asignadoDesde: "sep.asignado_desde",
  asignadoHasta: "sep.asignado_hasta",
  createdAt: "sep.creado_en",
};

const SEDE_EMPRESA_PORTERIA_SELECT_COLUMNS = `
  sep.id,
  sep.sede_id,
  s.nombre AS sede_nombre,
  sep.empresa_porteria_id,
  ep.nombre AS empresa_porteria_nombre,
  sep.activo,
  sep.asignado_desde,
  sep.asignado_hasta,
  sep.creado_en,
  sep.actualizado_en
`;

const SEDE_EMPRESA_PORTERIA_FROM_JOIN = `
  FROM public.sede_empresa_porteria sep
  INNER JOIN public.sede s ON s.id = sep.sede_id
  INNER JOIN public.empresa_porteria ep ON ep.id = sep.empresa_porteria_id
`;

const SEDE_EMPRESA_PORTERIA_RETURNING_COLUMNS = "id";

/** Repositorio Postgres para operaciones CRUD de asignaciones sede-empresa de porteria. */
@Injectable()
export class SedeEmpresaPorteriaSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista asignaciones sede-empresa de porteria paginadas aplicando filtros y orden.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(
    filters: SedeEmpresaPorteriaListFilters,
  ): Promise<PaginatedResult<SedeEmpresaPorteriaRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${SEDE_EMPRESA_PORTERIA_FROM_JOIN} ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<SedeEmpresaPorteriaRow>(
      `SELECT ${SEDE_EMPRESA_PORTERIA_SELECT_COLUMNS}
       ${SEDE_EMPRESA_PORTERIA_FROM_JOIN}
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

  /** Busca una asignacion sede-empresa de porteria por identificador. */
  async findById(id: number): Promise<SedeEmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<SedeEmpresaPorteriaRow>(
      `SELECT ${SEDE_EMPRESA_PORTERIA_SELECT_COLUMNS}
       ${SEDE_EMPRESA_PORTERIA_FROM_JOIN}
       WHERE sep.id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Verifica si existe una sede con el identificador dado. */
  async sedeExists(sedeId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id FROM public.sede WHERE id = $1`,
      [sedeId],
    );

    return rows.length > 0;
  }

  /** Verifica si existe una empresa de porteria con el identificador dado. */
  async empresaPorteriaExists(empresaPorteriaId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id FROM public.empresa_porteria WHERE id = $1`,
      [empresaPorteriaId],
    );

    return rows.length > 0;
  }

  /**
   * Busca cualquier otra asignacion activa para una sede, sin importar sus fechas.
   * @param sedeId - Identificador de la sede.
   * @param excludeId - Identificador de asignacion a excluir de la busqueda (para updates).
   * @returns Identificador de la asignacion en conflicto, o null si no hay ninguna.
   */
  async findActiveBySede(sedeId: number, excludeId?: number): Promise<number | null> {
    const params: unknown[] = [sedeId];
    let excludeSql = "";
    if (excludeId !== undefined) {
      params.push(excludeId);
      excludeSql = `AND id <> $${params.length}`;
    }

    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id
       FROM public.sede_empresa_porteria
       WHERE sede_id = $1 AND activo = true
       ${excludeSql}`,
      params,
    );

    return rows[0] ? Number(rows[0].id) : null;
  }

  /** Inserta una nueva asignacion sede-empresa de porteria en Postgres. */
  async create(input: CreateSedeEmpresaPorteriaInput): Promise<SedeEmpresaPorteriaRow> {
    const rows = await this.postgres.query<{ id: string }>(
      `INSERT INTO public.sede_empresa_porteria
         (sede_id, empresa_porteria_id, activo, asignado_desde, asignado_hasta)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SEDE_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      [input.sedeId, input.empresaPorteriaId, input.activo, input.asignadoDesde, input.asignadoHasta],
    );

    const created = await this.findById(Number(rows[0].id));
    if (!created) {
      throw new Error("No se pudo recuperar la asignacion recien creada");
    }
    return created;
  }

  /** Actualiza parcialmente una asignacion sede-empresa de porteria existente. */
  async update(id: number, input: UpdateSedeEmpresaPorteriaInput): Promise<SedeEmpresaPorteriaRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.sedeId !== undefined) setField("sede_id", input.sedeId);
    if (input.empresaPorteriaId !== undefined) setField("empresa_porteria_id", input.empresaPorteriaId);
    if (input.activo !== undefined) setField("activo", input.activo);
    if (input.asignadoDesde !== undefined) setField("asignado_desde", input.asignadoDesde);
    if (input.asignadoHasta !== undefined) setField("asignado_hasta", input.asignadoHasta);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.sede_empresa_porteria
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${SEDE_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      params,
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Desactiva una asignacion sede-empresa de porteria estableciendo `activo = false`. */
  async softDelete(id: number): Promise<SedeEmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.sede_empresa_porteria
       SET activo = false
       WHERE id = $1
       RETURNING ${SEDE_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Reactiva una asignacion sede-empresa de porteria estableciendo `activo = true`. */
  async activate(id: number): Promise<SedeEmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.sede_empresa_porteria
       SET activo = true
       WHERE id = $1
       RETURNING ${SEDE_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Elimina permanentemente una asignacion sede-empresa de porteria de la base de datos. */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.sede_empresa_porteria WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /** Construye clausula WHERE con filtros parametrizados. */
  private buildWhereClause(
    filters: SedeEmpresaPorteriaListFilters,
  ): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (filters.activo !== undefined) {
      params.push(filters.activo);
      whereClauses.push(`sep.activo = $${params.length}`);
    }

    if (filters.sedeId !== undefined) {
      params.push(filters.sedeId);
      whereClauses.push(`sep.sede_id = $${params.length}`);
    }

    if (filters.empresaPorteriaId !== undefined) {
      params.push(filters.empresaPorteriaId);
      whereClauses.push(`sep.empresa_porteria_id = $${params.length}`);
    }

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [`s.nombre ILIKE $${ilikeParam}`, `ep.nombre ILIKE $${ilikeParam}`];

      const parsedId = Number.parseInt(search, 10);
      if (Number.isFinite(parsedId) && parsedId > 0 && String(parsedId) === search) {
        params.push(parsedId);
        searchConditions.push(`sep.id = $${params.length}`);
      }

      whereClauses.push(`(${searchConditions.join(" OR ")})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  /** Construye clausula ORDER BY con whitelist de columnas. */
  private buildOrderClause(filters: SedeEmpresaPorteriaListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY sep.id DESC";
    }

    const expression = SEDE_EMPRESA_PORTERIA_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY sep.id DESC";
    }

    const direction: SedeEmpresaPorteriaSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, sep.id ASC`;
  }
}
