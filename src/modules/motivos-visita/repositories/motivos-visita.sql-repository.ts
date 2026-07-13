/**
 * @file motivos-visita.sql-repository.ts
 * @description Acceso SQL a la tabla `public.motivo_visita` con paginación, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateMotivoVisitaInput,
  MotivoVisitaListFilters,
  MotivoVisitaRow,
  UpdateMotivoVisitaInput,
} from "../motivos-visita.types";
import type { MotivoVisitaSortBy, MotivoVisitaSortOrder } from "../dto/list-motivos-visita-query.dto";

const MOTIVO_VISITA_SORT_EXPRESSIONS: Record<MotivoVisitaSortBy, string> = {
  id: "m.id",
  sedeNombre: "s.nombre",
  nombre: "m.nombre",
  createdAt: "m.creado_en",
};

const MOTIVO_VISITA_SELECT_COLUMNS = `
  m.id, m.sede_id, s.nombre AS sede_nombre,
  m.nombre, m.activo, m.creado_en, m.actualizado_en
`;
const MOTIVO_FROM = `FROM public.motivo_visita m LEFT JOIN public.sede s ON s.id=m.sede_id`;

/** Repositorio Postgres para operaciones CRUD de motivos de visita. */
@Injectable()
export class MotivosVisitaSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista motivos de visita paginados aplicando filtros y orden.
   * @param filters - Paginación, búsqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginación.
   */
  async findAll(filters: MotivoVisitaListFilters): Promise<PaginatedResult<MotivoVisitaRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${MOTIVO_FROM} ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<MotivoVisitaRow>(
      `SELECT ${MOTIVO_VISITA_SELECT_COLUMNS}
       ${MOTIVO_FROM}
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
   * Busca un motivo de visita por identificador.
   * @param id - ID numérico del motivo.
   * @returns Fila encontrada o `null`.
   */
  async findById(id: number): Promise<MotivoVisitaRow | null> {
    const rows = await this.postgres.query<MotivoVisitaRow>(
      `SELECT ${MOTIVO_VISITA_SELECT_COLUMNS}
       ${MOTIVO_FROM}
       WHERE m.id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /**
   * Busca un motivo de visita por nombre exacto.
   * @param nombre - Nombre del motivo.
   * @returns Fila encontrada o `null`.
   */
  async findByNombre(nombre: string, sedeId?: number): Promise<MotivoVisitaRow | null> {
    const rows = await this.postgres.query<MotivoVisitaRow>(
      `SELECT ${MOTIVO_VISITA_SELECT_COLUMNS}
       ${MOTIVO_FROM}
       WHERE m.nombre = $1 AND ($2::bigint IS NULL OR m.sede_id=$2)`,
      [nombre, sedeId ?? null],
    );

    return rows[0] ?? null;
  }

  /**
   * Cuenta visitas vinculadas a un motivo de visita.
   * @param motivoVisitaId - ID del motivo.
   * @returns Cantidad de visitas asociadas.
   */
  async countVisitas(motivoVisitaId: number): Promise<number> {
    const rows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total
       FROM public.visita
       WHERE motivo_visita_id = $1`,
      [motivoVisitaId],
    );

    return Number(rows[0]?.total ?? 0);
  }

  /**
   * Inserta un nuevo motivo de visita en Postgres.
   * @param input - Datos normalizados de creación.
   * @returns Fila del motivo creado.
   */
  async create(input: CreateMotivoVisitaInput): Promise<MotivoVisitaRow> {
    const rows = await this.postgres.query<{id:string}>(
      `INSERT INTO public.motivo_visita (sede_id, nombre, activo)
       VALUES ($1, $2, $3) RETURNING id`,
      [input.sedeId, input.nombre, input.activo],
    );
    return (await this.findById(Number(rows[0].id)))!;
  }

  /**
   * Actualiza parcialmente un motivo de visita existente.
   * @param id - ID del motivo a modificar.
   * @param input - Campos a persistir.
   * @returns Fila actualizada o `null` si no existe.
   */
  async update(id: number, input: UpdateMotivoVisitaInput): Promise<MotivoVisitaRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.nombre !== undefined) setField("nombre", input.nombre);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<{id:string}>(
      `UPDATE public.motivo_visita
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING id`,
      params,
    );

    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  /**
   * Desactiva un motivo de visita estableciendo `activo = false`.
   * @param id - ID del motivo.
   * @returns Fila actualizada o `null` si no existe.
   */
  async softDelete(id: number): Promise<MotivoVisitaRow | null> {
    const rows = await this.postgres.query<{id:string}>(
      `UPDATE public.motivo_visita
       SET activo = false
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  /**
   * Reactiva un motivo de visita estableciendo `activo = true`.
   * @param id - ID del motivo.
   * @returns Fila actualizada o `null` si no existe.
   */
  async activate(id: number): Promise<MotivoVisitaRow | null> {
    const rows = await this.postgres.query<{id:string}>(
      `UPDATE public.motivo_visita
       SET activo = true
       WHERE id = $1
       RETURNING id`,
      [id],
    );

    return rows[0] ? this.findById(Number(rows[0].id)) : null;
  }

  /**
   * Elimina permanentemente un motivo de visita de la base de datos.
   * @param id - ID del motivo.
   * @returns ID eliminado como número o `null` si no existía.
   */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.motivo_visita WHERE id = $1 RETURNING id`,
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
  private buildWhereClause(filters: MotivoVisitaListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];
    if (filters.sedeIds !== undefined) { params.push(filters.sedeIds); whereClauses.push(`m.sede_id = ANY($${params.length}::bigint[])`); }
    if (filters.sedeId !== undefined) { params.push(filters.sedeId); whereClauses.push(`m.sede_id = $${params.length}`); }

    const addIlike = (column: string, value?: string): void => {
      const trimmed = value?.trim();
      if (!trimmed) return;
      params.push(`%${trimmed}%`);
      whereClauses.push(`${column} ILIKE $${params.length}`);
    };

    if (filters.activo !== undefined) {
      params.push(filters.activo);
      whereClauses.push(`m.activo = $${params.length}`);
    }

    addIlike("m.nombre", filters.nombre);

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [`m.nombre ILIKE $${ilikeParam}`, `s.nombre ILIKE $${ilikeParam}`];

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
  private buildOrderClause(filters: MotivoVisitaListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY m.nombre ASC, m.id ASC";
    }

    const expression = MOTIVO_VISITA_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY m.nombre ASC, m.id ASC";
    }

    const direction: MotivoVisitaSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()}, m.id ASC`;
  }
}
