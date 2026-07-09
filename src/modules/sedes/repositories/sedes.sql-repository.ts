/**
 * @file sedes.sql-repository.ts
 * @description Acceso SQL a la tabla `public.sede` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateSedeInput,
  SedeListFilters,
  SedeRow,
  UpdateSedeInput,
} from "../sedes.types";
import type { SedeSortBy, SedeSortOrder } from "../dto/list-sedes-query.dto";

const SEDE_SORT_EXPRESSIONS: Record<SedeSortBy, string> = {
  id: "s.id",
  nombre: "s.nombre",
  direccion: "s.direccion",
  telefono: "s.telefono",
  empresaId: "s.empresa_id",
  createdAt: "s.creado_en",
};

const SEDE_SELECT_COLUMNS = `
  s.id,
  s.empresa_id,
  e.nombre AS empresa_nombre,
  s.nombre,
  s.direccion,
  s.telefono,
  s.activo,
  s.creado_en,
  s.actualizado_en
`;

const SEDE_FROM_JOIN = `
  FROM public.sede s
  INNER JOIN public.empresa e ON e.id = s.empresa_id
`;

const SEDE_RETURNING_COLUMNS = "id";

/** Repositorio Postgres para operaciones CRUD de sedes. */
@Injectable()
export class SedesSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista sedes paginadas aplicando filtros y orden.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(filters: SedeListFilters): Promise<PaginatedResult<SedeRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${SEDE_FROM_JOIN} ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<SedeRow>(
      `SELECT ${SEDE_SELECT_COLUMNS}
       ${SEDE_FROM_JOIN}
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

  /** Busca una sede por identificador. */
  async findById(id: number): Promise<SedeRow | null> {
    const rows = await this.postgres.query<SedeRow>(
      `SELECT ${SEDE_SELECT_COLUMNS}
       ${SEDE_FROM_JOIN}
       WHERE s.id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Verifica si existe una empresa con el identificador dado. */
  async empresaExists(empresaId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id FROM public.empresa WHERE id = $1`,
      [empresaId],
    );

    return rows.length > 0;
  }

  /** Cuenta relaciones que impiden borrar definitivamente una sede. */
  async countBlockingRelations(sedeId: number): Promise<number> {
    const rows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM public.sede_empresa_porteria
       WHERE sede_id = $1`,
      [sedeId],
    );

    return Number(rows[0]?.total ?? 0);
  }

  /** Inserta una nueva sede en Postgres. */
  async create(input: CreateSedeInput): Promise<SedeRow> {
    const rows = await this.postgres.query<{ id: string }>(
      `INSERT INTO public.sede (empresa_id, nombre, direccion, telefono, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${SEDE_RETURNING_COLUMNS}`,
      [input.empresaId, input.nombre, input.direccion, input.telefono, input.activo],
    );

    const created = await this.findById(Number(rows[0].id));
    if (!created) {
      throw new Error("No se pudo recuperar la sede recien creada");
    }
    return created;
  }

  /** Actualiza parcialmente una sede existente. */
  async update(id: number, input: UpdateSedeInput): Promise<SedeRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.empresaId !== undefined) setField("empresa_id", input.empresaId);
    if (input.nombre !== undefined) setField("nombre", input.nombre);
    if (input.direccion !== undefined) setField("direccion", input.direccion);
    if (input.telefono !== undefined) setField("telefono", input.telefono);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.sede
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${SEDE_RETURNING_COLUMNS}`,
      params,
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Desactiva una sede estableciendo `activo = false`. */
  async softDelete(id: number): Promise<SedeRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.sede
       SET activo = false
       WHERE id = $1
       RETURNING ${SEDE_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Reactiva una sede estableciendo `activo = true`. */
  async activate(id: number): Promise<SedeRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.sede
       SET activo = true
       WHERE id = $1
       RETURNING ${SEDE_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Elimina permanentemente una sede de la base de datos. */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.sede WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /** Construye clausula WHERE con filtros parametrizados. */
  private buildWhereClause(filters: SedeListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    const addIlike = (column: string, value?: string): void => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      params.push(`%${trimmed}%`);
      whereClauses.push(`${column} ILIKE $${params.length}`);
    };

    if (filters.activo !== undefined) {
      params.push(filters.activo);
      whereClauses.push(`s.activo = $${params.length}`);
    }

    if (filters.empresaId !== undefined) {
      params.push(filters.empresaId);
      whereClauses.push(`s.empresa_id = $${params.length}`);
    }

    addIlike("s.nombre", filters.nombre);
    addIlike("s.direccion", filters.direccion);
    addIlike("s.telefono", filters.telefono);

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [
        `s.nombre ILIKE $${ilikeParam}`,
        `s.direccion ILIKE $${ilikeParam}`,
        `s.telefono ILIKE $${ilikeParam}`,
        `e.nombre ILIKE $${ilikeParam}`,
      ];

      const parsedId = Number.parseInt(search, 10);
      if (Number.isFinite(parsedId) && parsedId > 0 && String(parsedId) === search) {
        params.push(parsedId);
        searchConditions.push(`s.id = $${params.length}`);
      }

      whereClauses.push(`(${searchConditions.join(" OR ")})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  /** Construye clausula ORDER BY con whitelist de columnas. */
  private buildOrderClause(filters: SedeListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY s.id DESC";
    }

    const expression = SEDE_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY s.id DESC";
    }

    const direction: SedeSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, s.id ASC`;
  }
}
