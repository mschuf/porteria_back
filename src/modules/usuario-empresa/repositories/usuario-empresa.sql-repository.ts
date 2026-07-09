/**
 * @file usuario-empresa.sql-repository.ts
 * @description Acceso SQL a la tabla `public.usuario_empresa` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateUsuarioEmpresaInput,
  UsuarioEmpresaListFilters,
  UsuarioEmpresaRow,
  UpdateUsuarioEmpresaInput,
} from "../usuario-empresa.types";
import type { UsuarioEmpresaSortBy, UsuarioEmpresaSortOrder } from "../dto/list-usuario-empresa-query.dto";

const USUARIO_EMPRESA_SORT_EXPRESSIONS: Record<UsuarioEmpresaSortBy, string> = {
  id: "ue.id",
  usuarioId: "ue.usuario_id",
  empresaId: "ue.empresa_id",
  createdAt: "ue.creado_en",
};

const USUARIO_EMPRESA_SELECT_COLUMNS = `
  ue.id,
  ue.usuario_id,
  u.nombre AS usuario_nombre,
  ue.empresa_id,
  e.nombre AS empresa_nombre,
  ue.activo,
  ue.creado_en
`;

const USUARIO_EMPRESA_FROM_JOIN = `
  FROM public.usuario_empresa ue
  INNER JOIN public.usuario u ON u.id = ue.usuario_id
  INNER JOIN public.empresa e ON e.id = ue.empresa_id
`;

const USUARIO_EMPRESA_RETURNING_COLUMNS = "id";

/** Repositorio Postgres para operaciones CRUD de asignaciones usuario-empresa. */
@Injectable()
export class UsuarioEmpresaSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista asignaciones usuario-empresa paginadas aplicando filtros y orden.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(filters: UsuarioEmpresaListFilters): Promise<PaginatedResult<UsuarioEmpresaRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${USUARIO_EMPRESA_FROM_JOIN} ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<UsuarioEmpresaRow>(
      `SELECT ${USUARIO_EMPRESA_SELECT_COLUMNS}
       ${USUARIO_EMPRESA_FROM_JOIN}
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

  /** Busca una asignacion usuario-empresa por identificador. */
  async findById(id: number): Promise<UsuarioEmpresaRow | null> {
    const rows = await this.postgres.query<UsuarioEmpresaRow>(
      `SELECT ${USUARIO_EMPRESA_SELECT_COLUMNS}
       ${USUARIO_EMPRESA_FROM_JOIN}
       WHERE ue.id = $1`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Verifica si existe un usuario con el identificador dado. */
  async usuarioExists(usuarioId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id FROM public.usuario WHERE id = $1`,
      [usuarioId],
    );

    return rows.length > 0;
  }

  /** Verifica si existe una empresa con el identificador dado. */
  async empresaExists(empresaId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id FROM public.empresa WHERE id = $1`,
      [empresaId],
    );

    return rows.length > 0;
  }

  /**
   * Busca otra asignacion activa para el mismo par usuario-empresa.
   * @param usuarioId - Identificador del usuario.
   * @param empresaId - Identificador de la empresa.
   * @param excludeId - Identificador de asignacion a excluir de la busqueda (para updates).
   * @returns Identificador de la asignacion en conflicto, o null si no hay ninguna.
   */
  async findActiveDuplicate(usuarioId: number, empresaId: number, excludeId?: number): Promise<number | null> {
    const params: unknown[] = [usuarioId, empresaId];
    let excludeSql = "";
    if (excludeId !== undefined) {
      params.push(excludeId);
      excludeSql = `AND id <> $${params.length}`;
    }

    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id
       FROM public.usuario_empresa
       WHERE usuario_id = $1 AND empresa_id = $2 AND activo = true
       ${excludeSql}`,
      params,
    );

    return rows[0] ? Number(rows[0].id) : null;
  }

  /** Inserta una nueva asignacion usuario-empresa en Postgres. */
  async create(input: CreateUsuarioEmpresaInput): Promise<UsuarioEmpresaRow> {
    const rows = await this.postgres.query<{ id: string }>(
      `INSERT INTO public.usuario_empresa (usuario_id, empresa_id, activo)
       VALUES ($1, $2, $3)
       RETURNING ${USUARIO_EMPRESA_RETURNING_COLUMNS}`,
      [input.usuarioId, input.empresaId, input.activo],
    );

    const created = await this.findById(Number(rows[0].id));
    if (!created) {
      throw new Error("No se pudo recuperar la asignacion recien creada");
    }
    return created;
  }

  /** Actualiza parcialmente una asignacion usuario-empresa existente. */
  async update(id: number, input: UpdateUsuarioEmpresaInput): Promise<UsuarioEmpresaRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.usuarioId !== undefined) setField("usuario_id", input.usuarioId);
    if (input.empresaId !== undefined) setField("empresa_id", input.empresaId);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.usuario_empresa
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${USUARIO_EMPRESA_RETURNING_COLUMNS}`,
      params,
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Desactiva una asignacion usuario-empresa estableciendo `activo = false`. */
  async softDelete(id: number): Promise<UsuarioEmpresaRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.usuario_empresa
       SET activo = false
       WHERE id = $1
       RETURNING ${USUARIO_EMPRESA_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Reactiva una asignacion usuario-empresa estableciendo `activo = true`. */
  async activate(id: number): Promise<UsuarioEmpresaRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.usuario_empresa
       SET activo = true
       WHERE id = $1
       RETURNING ${USUARIO_EMPRESA_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Elimina permanentemente una asignacion usuario-empresa de la base de datos. */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.usuario_empresa WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /** Construye clausula WHERE con filtros parametrizados. */
  private buildWhereClause(filters: UsuarioEmpresaListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (filters.activo !== undefined) {
      params.push(filters.activo);
      whereClauses.push(`ue.activo = $${params.length}`);
    }

    if (filters.usuarioId !== undefined) {
      params.push(filters.usuarioId);
      whereClauses.push(`ue.usuario_id = $${params.length}`);
    }

    if (filters.empresaId !== undefined) {
      params.push(filters.empresaId);
      whereClauses.push(`ue.empresa_id = $${params.length}`);
    }

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [`u.nombre ILIKE $${ilikeParam}`, `e.nombre ILIKE $${ilikeParam}`];

      const parsedId = Number.parseInt(search, 10);
      if (Number.isFinite(parsedId) && parsedId > 0 && String(parsedId) === search) {
        params.push(parsedId);
        searchConditions.push(`ue.id = $${params.length}`);
      }

      whereClauses.push(`(${searchConditions.join(" OR ")})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  /** Construye clausula ORDER BY con whitelist de columnas. */
  private buildOrderClause(filters: UsuarioEmpresaListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY ue.id DESC";
    }

    const expression = USUARIO_EMPRESA_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY ue.id DESC";
    }

    const direction: UsuarioEmpresaSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, ue.id ASC`;
  }
}
