/**
 * @file empresa-porteria.sql-repository.ts
 * @description Acceso SQL a la tabla `public.empresa_porteria` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateEmpresaPorteriaInput,
  EmpresaPorteriaListFilters,
  EmpresaPorteriaRow,
  UpdateEmpresaPorteriaInput,
} from "../empresa-porteria.types";
import type { EmpresaPorteriaSortBy, EmpresaPorteriaSortOrder } from "../dto/list-empresa-porteria-query.dto";

const EMPRESA_PORTERIA_SORT_EXPRESSIONS: Record<EmpresaPorteriaSortBy, string> = {
  id: "id",
  nombre: "nombre",
  ruc: "ruc",
  telefono: "telefono",
  correo: "correo",
  createdAt: "creado_en",
};

const EMPRESA_PORTERIA_SELECT_COLUMNS = `
  id,
  nombre,
  ruc,
  telefono,
  correo,
  activo,
  creado_en,
  actualizado_en
`;

/** Repositorio Postgres para operaciones CRUD de empresas de porteria. */
@Injectable()
export class EmpresaPorteriaSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista empresas de porteria paginadas aplicando filtros y orden.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(filters: EmpresaPorteriaListFilters): Promise<PaginatedResult<EmpresaPorteriaRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.empresa_porteria ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<EmpresaPorteriaRow>(
      `SELECT ${EMPRESA_PORTERIA_SELECT_COLUMNS}
       FROM public.empresa_porteria
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

  /** Busca una empresa de seguridad por identificador. */
  async findById(id: number): Promise<EmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<EmpresaPorteriaRow>(
      `SELECT ${EMPRESA_PORTERIA_SELECT_COLUMNS}
       FROM public.empresa_porteria
       WHERE id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Busca una empresa de seguridad por RUC exacto. */
  async findByRuc(ruc: string): Promise<EmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<EmpresaPorteriaRow>(
      `SELECT ${EMPRESA_PORTERIA_SELECT_COLUMNS}
       FROM public.empresa_porteria
       WHERE ruc = $1`,
      [ruc],
    );

    return rows[0] ?? null;
  }

  /** Cuenta relaciones que impiden borrar definitivamente una empresa de seguridad. */
  async countBlockingRelations(empresaPorteriaId: number): Promise<number> {
    const rows = await this.postgres.query<{ total: string }>(
      `SELECT (
         (SELECT COUNT(*) FROM public.sede_empresa_porteria WHERE empresa_porteria_id = $1) +
         (SELECT COUNT(*) FROM public.usuario_empresa_porteria WHERE empresa_porteria_id = $1)
       )::text AS total`,
      [empresaPorteriaId],
    );

    return Number(rows[0]?.total ?? 0);
  }

  /** Inserta una nueva empresa de seguridad en Postgres. */
  async create(input: CreateEmpresaPorteriaInput): Promise<EmpresaPorteriaRow> {
    const rows = await this.postgres.query<EmpresaPorteriaRow>(
      `INSERT INTO public.empresa_porteria (nombre, ruc, telefono, correo, activo)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING ${EMPRESA_PORTERIA_SELECT_COLUMNS}`,
      [input.nombre, input.ruc, input.telefono, input.correo, input.activo],
    );

    return rows[0];
  }

  /** Actualiza parcialmente una empresa de seguridad existente. */
  async update(id: number, input: UpdateEmpresaPorteriaInput): Promise<EmpresaPorteriaRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.nombre !== undefined) setField("nombre", input.nombre);
    if (input.ruc !== undefined) setField("ruc", input.ruc);
    if (input.telefono !== undefined) setField("telefono", input.telefono);
    if (input.correo !== undefined) setField("correo", input.correo);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<EmpresaPorteriaRow>(
      `UPDATE public.empresa_porteria
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${EMPRESA_PORTERIA_SELECT_COLUMNS}`,
      params,
    );

    return rows[0] ?? null;
  }

  /** Desactiva una empresa de seguridad estableciendo `activo = false`. */
  async softDelete(id: number): Promise<EmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<EmpresaPorteriaRow>(
      `UPDATE public.empresa_porteria
       SET activo = false
       WHERE id = $1
       RETURNING ${EMPRESA_PORTERIA_SELECT_COLUMNS}`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Reactiva una empresa de seguridad estableciendo `activo = true`. */
  async activate(id: number): Promise<EmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<EmpresaPorteriaRow>(
      `UPDATE public.empresa_porteria
       SET activo = true
       WHERE id = $1
       RETURNING ${EMPRESA_PORTERIA_SELECT_COLUMNS}`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Elimina permanentemente una empresa de seguridad de la base de datos. */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.empresa_porteria WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /** Construye clausula WHERE con filtros parametrizados. */
  private buildWhereClause(
    filters: EmpresaPorteriaListFilters,
  ): { whereSql: string; params: unknown[] } {
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
    addIlike("telefono", filters.telefono);
    addIlike("correo", filters.correo);

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [
        `nombre ILIKE $${ilikeParam}`,
        `ruc ILIKE $${ilikeParam}`,
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
  private buildOrderClause(filters: EmpresaPorteriaListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY id DESC";
    }

    const expression = EMPRESA_PORTERIA_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY id DESC";
    }

    const direction: EmpresaPorteriaSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, id ASC`;
  }
}
