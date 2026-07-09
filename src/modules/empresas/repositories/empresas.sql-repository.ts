/**
 * @file empresas.sql-repository.ts
 * @description Acceso SQL a la tabla `public.empresa` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateEmpresaInput,
  EmpresaListFilters,
  EmpresaRow,
  UpdateEmpresaInput,
} from "../empresas.types";
import type { EmpresaSortBy, EmpresaSortOrder } from "../dto/list-empresas-query.dto";

const EMPRESA_SORT_EXPRESSIONS: Record<EmpresaSortBy, string> = {
  id: "id",
  nombre: "nombre",
  ruc: "ruc",
  direccion: "direccion",
  telefono: "telefono",
  correo: "correo",
  createdAt: "creado_en",
};

const EMPRESA_SELECT_COLUMNS = `
  id,
  nombre,
  ruc,
  direccion,
  telefono,
  correo,
  activo,
  creado_en,
  actualizado_en
`;

/** Repositorio Postgres para operaciones CRUD de empresas. */
@Injectable()
export class EmpresasSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista empresas paginadas aplicando filtros y orden.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(filters: EmpresaListFilters): Promise<PaginatedResult<EmpresaRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.empresa ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<EmpresaRow>(
      `SELECT ${EMPRESA_SELECT_COLUMNS}
       FROM public.empresa
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

  /** Busca una empresa por identificador. */
  async findById(id: number): Promise<EmpresaRow | null> {
    const rows = await this.postgres.query<EmpresaRow>(
      `SELECT ${EMPRESA_SELECT_COLUMNS}
       FROM public.empresa
       WHERE id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Busca una empresa por RUC exacto. */
  async findByRuc(ruc: string): Promise<EmpresaRow | null> {
    const rows = await this.postgres.query<EmpresaRow>(
      `SELECT ${EMPRESA_SELECT_COLUMNS}
       FROM public.empresa
       WHERE ruc = $1`,
      [ruc],
    );

    return rows[0] ?? null;
  }

  /** Cuenta relaciones que impiden borrar definitivamente una empresa. */
  async countBlockingRelations(empresaId: number): Promise<number> {
    const rows = await this.postgres.query<{ total: string }>(
      `SELECT (
         (SELECT COUNT(*) FROM public.sede WHERE empresa_id = $1) +
         (SELECT COUNT(*) FROM public.usuario_empresa WHERE empresa_id = $1)
       )::text AS total`,
      [empresaId],
    );

    return Number(rows[0]?.total ?? 0);
  }

  /** Inserta una nueva empresa en Postgres. */
  async create(input: CreateEmpresaInput): Promise<EmpresaRow> {
    const rows = await this.postgres.query<EmpresaRow>(
      `INSERT INTO public.empresa (nombre, ruc, direccion, telefono, correo, activo)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${EMPRESA_SELECT_COLUMNS}`,
      [input.nombre, input.ruc, input.direccion, input.telefono, input.correo, input.activo],
    );

    return rows[0];
  }

  /** Actualiza parcialmente una empresa existente. */
  async update(id: number, input: UpdateEmpresaInput): Promise<EmpresaRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.nombre !== undefined) setField("nombre", input.nombre);
    if (input.ruc !== undefined) setField("ruc", input.ruc);
    if (input.direccion !== undefined) setField("direccion", input.direccion);
    if (input.telefono !== undefined) setField("telefono", input.telefono);
    if (input.correo !== undefined) setField("correo", input.correo);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<EmpresaRow>(
      `UPDATE public.empresa
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${EMPRESA_SELECT_COLUMNS}`,
      params,
    );

    return rows[0] ?? null;
  }

  /** Desactiva una empresa estableciendo `activo = false`. */
  async softDelete(id: number): Promise<EmpresaRow | null> {
    const rows = await this.postgres.query<EmpresaRow>(
      `UPDATE public.empresa
       SET activo = false
       WHERE id = $1
       RETURNING ${EMPRESA_SELECT_COLUMNS}`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Reactiva una empresa estableciendo `activo = true`. */
  async activate(id: number): Promise<EmpresaRow | null> {
    const rows = await this.postgres.query<EmpresaRow>(
      `UPDATE public.empresa
       SET activo = true
       WHERE id = $1
       RETURNING ${EMPRESA_SELECT_COLUMNS}`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Elimina permanentemente una empresa de la base de datos. */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.empresa WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /** Construye clausula WHERE con filtros parametrizados. */
  private buildWhereClause(filters: EmpresaListFilters): { whereSql: string; params: unknown[] } {
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
      whereClauses.push(`activo = $${params.length}`);
    }

    addIlike("nombre", filters.nombre);
    addIlike("ruc", filters.ruc);
    addIlike("direccion", filters.direccion);
    addIlike("telefono", filters.telefono);
    addIlike("correo", filters.correo);

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [
        `nombre ILIKE $${ilikeParam}`,
        `ruc ILIKE $${ilikeParam}`,
        `direccion ILIKE $${ilikeParam}`,
        `telefono ILIKE $${ilikeParam}`,
        `correo ILIKE $${ilikeParam}`,
      ];

      const parsedId = Number.parseInt(search, 10);
      if (Number.isFinite(parsedId) && parsedId > 0 && String(parsedId) === search) {
        params.push(parsedId);
        searchConditions.push(`id = $${params.length}`);
      }

      whereClauses.push(`(${searchConditions.join(" OR ")})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  /** Construye clausula ORDER BY con whitelist de columnas. */
  private buildOrderClause(filters: EmpresaListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY id DESC";
    }

    const expression = EMPRESA_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY id DESC";
    }

    const direction: EmpresaSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, id ASC`;
  }
}

