/**
 * @file proveedores.sql-repository.ts
 * @description Acceso SQL a la tabla `public.proveedor` con paginación, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateProveedorInput,
  ProveedorListFilters,
  ProveedorRow,
  UpdateProveedorInput,
} from "../proveedores.types";
import type { ProveedorSortBy, ProveedorSortOrder } from "../dto/list-proveedores-query.dto";

const PROVEEDOR_SORT_EXPRESSIONS: Record<ProveedorSortBy, string> = {
  id: "id",
  sedeNombre: "s.nombre",
  nombre: "nombre",
  ruc: "ruc",
  createdAt: "creado_en",
};

const PROVEEDOR_SELECT_COLUMNS = `
  p.id, p.sede_id, s.nombre AS sede_nombre,
  p.nombre, p.ruc, p.activo,
  p.creado_en AS created_at,
  p.actualizado_en AS updated_at
`;

/** Repositorio Postgres para operaciones CRUD de proveedores. */
@Injectable()
export class ProveedoresSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista proveedores paginados aplicando filtros y orden.
   * @param filters - Paginación, búsqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginación.
   */
  async findAll(filters: ProveedorListFilters): Promise<PaginatedResult<ProveedorRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.proveedor p LEFT JOIN public.sede s ON s.id=p.sede_id ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<ProveedorRow>(
      `SELECT ${PROVEEDOR_SELECT_COLUMNS}
       FROM public.proveedor p LEFT JOIN public.sede s ON s.id=p.sede_id
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
   * Busca un proveedor por identificador.
   * @param id - ID numérico del proveedor.
   * @returns Fila encontrada o `null`.
   */
  async findById(id: number): Promise<ProveedorRow | null> {
    const rows = await this.postgres.query<ProveedorRow>(
      `SELECT ${PROVEEDOR_SELECT_COLUMNS}
       FROM public.proveedor p LEFT JOIN public.sede s ON s.id=p.sede_id
       WHERE p.id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /**
   * Busca un proveedor por nombre exacto (case-sensitive en Postgres, comparación normalizada en servicio).
   * @param nombre - Nombre del proveedor.
   * @returns Fila encontrada o `null`.
   */
  async findByNombre(nombre: string, sedeId?: number): Promise<ProveedorRow | null> {
    const rows = await this.postgres.query<ProveedorRow>(
      `SELECT ${PROVEEDOR_SELECT_COLUMNS}
       FROM public.proveedor p LEFT JOIN public.sede s ON s.id=p.sede_id
       WHERE p.nombre = $1 AND ($2::bigint IS NULL OR p.sede_id = $2)`,
      [nombre, sedeId ?? null],
    );

    return rows[0] ?? null;
  }

  /**
   * Busca un proveedor por RUC exacto.
   * @param ruc - RUC del proveedor.
   * @returns Fila encontrada o `null`.
   */
  async findByRuc(ruc: string, sedeId?: number): Promise<ProveedorRow | null> {
    const rows = await this.postgres.query<ProveedorRow>(
      `SELECT ${PROVEEDOR_SELECT_COLUMNS}
       FROM public.proveedor p LEFT JOIN public.sede s ON s.id=p.sede_id
       WHERE p.ruc = $1 AND ($2::bigint IS NULL OR p.sede_id = $2)`,
      [ruc, sedeId ?? null],
    );

    return rows[0] ?? null;
  }

  /**
   * Cuenta personas vinculadas a un proveedor.
   * @param proveedorId - ID del proveedor.
   * @returns Cantidad de personas asociadas.
   */
  async countPersonas(proveedorId: number): Promise<number> {
    const rows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM public.persona
       WHERE proveedor_id = $1`,
      [proveedorId],
    );

    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Inserta un nuevo proveedor en Postgres.
   * @param input - Datos normalizados de creación.
   * @returns Fila del proveedor creado.
   */
  async create(input: CreateProveedorInput): Promise<ProveedorRow> {
    const rows = await this.postgres.query<{ id: string }>(
      `INSERT INTO public.proveedor (sede_id, nombre, ruc, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING id`,
      [input.sedeId, input.nombre, input.ruc, input.activo],
    );
    return (await this.findById(Number(rows[0].id)))!;
  }

  /**
   * Actualiza parcialmente un proveedor existente.
   * @param id - ID del proveedor a modificar.
   * @param input - Campos a persistir.
   * @returns Fila actualizada o `null` si no existe.
   */
  async update(id: number, input: UpdateProveedorInput): Promise<ProveedorRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.nombre !== undefined) setField("nombre", input.nombre);
    if (input.ruc !== undefined) setField("ruc", input.ruc);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    assignments.push("actualizado_en = now()");
    params.push(id);

    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.proveedor
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING id`,
      params,
    );

    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  /**
   * Desactiva un proveedor estableciendo `activo = false`.
   * @param id - ID del proveedor.
   * @returns Fila actualizada o `null` si no existe.
   */
  async softDelete(id: number): Promise<ProveedorRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.proveedor
       SET activo = false, actualizado_en = now()
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  /**
   * Reactiva un proveedor estableciendo `activo = true`.
   * @param id - ID del proveedor.
   * @returns Fila actualizada o `null` si no existe.
   */
  async activate(id: number): Promise<ProveedorRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.proveedor
       SET activo = true, actualizado_en = now()
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  /**
   * Elimina permanentemente un proveedor de la base de datos.
   * @param id - ID del proveedor.
   * @returns ID eliminado como número o `null` si no existía.
   */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.proveedor WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /**
   * Construye cláusula WHERE con filtros parametrizados.
   * @param filters - Filtros del listado.
   * @returns SQL WHERE y parámetros.
   */
  private buildWhereClause(filters: ProveedorListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];
    if (filters.sedeIds !== undefined) { params.push(filters.sedeIds); whereClauses.push(`p.sede_id = ANY($${params.length}::bigint[])`); }
    if (filters.sedeId !== undefined) { params.push(filters.sedeId); whereClauses.push(`p.sede_id = $${params.length}`); }

    const addIlike = (column: string, value?: string): void => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      params.push(`%${trimmed}%`);
      whereClauses.push(`${column} ILIKE $${params.length}`);
    };

    if (filters.activo !== undefined) {
      params.push(filters.activo);
      whereClauses.push(`p.activo = $${params.length}`);
    }

    addIlike("p.nombre", filters.nombre);
    addIlike("p.ruc", filters.ruc);

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [`p.nombre ILIKE $${ilikeParam}`, `p.ruc ILIKE $${ilikeParam}`, `s.nombre ILIKE $${ilikeParam}`];

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

  /**
   * Construye cláusula ORDER BY con whitelist de columnas.
   * @param filters - Filtros del listado incluyendo sort opcional.
   * @returns Fragmento SQL `ORDER BY ...`.
   */
  private buildOrderClause(filters: ProveedorListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY id DESC";
    }

    const expression = PROVEEDOR_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY id DESC";
    }

    const direction: ProveedorSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()}, id ASC`;
  }
}
