/**
 * @file usuario-empresa-porteria.sql-repository.ts
 * @description Acceso SQL a la tabla `public.usuario_empresa_seguridad` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateUsuarioEmpresaPorteriaInput,
  UsuarioEmpresaPorteriaListFilters,
  UsuarioEmpresaPorteriaRow,
  UpdateUsuarioEmpresaPorteriaInput,
} from "../usuario-empresa-porteria.types";
import type {
  UsuarioEmpresaPorteriaSortBy,
  UsuarioEmpresaPorteriaSortOrder,
} from "../dto/list-usuario-empresa-porteria-query.dto";

const USUARIO_EMPRESA_PORTERIA_SORT_EXPRESSIONS: Record<UsuarioEmpresaPorteriaSortBy, string> = {
  id: "uep.id",
  usuarioId: "uep.usuario_id",
  empresaPorteriaId: "uep.empresa_seguridad_id",
  sedeId: "s.id",
  createdAt: "uep.creado_en",
};

const USUARIO_EMPRESA_PORTERIA_SELECT_COLUMNS = `
  uep.id,
  uep.usuario_id,
  u.nombre AS usuario_nombre,
  uep.empresa_seguridad_id,
  ep.nombre AS empresa_porteria_nombre,
  uep.sede_empresa_seguridad_id,
  s.id AS sede_id,
  s.nombre AS sede_nombre,
  uep.activo,
  uep.creado_en
`;

const USUARIO_EMPRESA_PORTERIA_FROM_JOIN = `
  FROM public.usuario_empresa_seguridad uep
  INNER JOIN public.usuario u ON u.id = uep.usuario_id
  INNER JOIN public.empresa_seguridad ep ON ep.id = uep.empresa_seguridad_id
  INNER JOIN public.sede_empresa_seguridad sep ON sep.id = uep.sede_empresa_seguridad_id
  INNER JOIN public.sede s ON s.id = sep.sede_id
`;

const USUARIO_EMPRESA_PORTERIA_RETURNING_COLUMNS = "id";

/** Repositorio Postgres para operaciones CRUD de asignaciones usuario-empresa-porteria. */
@Injectable()
export class UsuarioEmpresaPorteriaSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista asignaciones usuario-empresa-porteria paginadas aplicando filtros y orden.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(filters: UsuarioEmpresaPorteriaListFilters): Promise<PaginatedResult<UsuarioEmpresaPorteriaRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total ${USUARIO_EMPRESA_PORTERIA_FROM_JOIN} ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<UsuarioEmpresaPorteriaRow>(
      `SELECT ${USUARIO_EMPRESA_PORTERIA_SELECT_COLUMNS}
       ${USUARIO_EMPRESA_PORTERIA_FROM_JOIN}
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

  /** Busca una asignacion usuario-empresa-porteria por identificador. */
  async findById(id: number): Promise<UsuarioEmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<UsuarioEmpresaPorteriaRow>(
      `SELECT ${USUARIO_EMPRESA_PORTERIA_SELECT_COLUMNS}
       ${USUARIO_EMPRESA_PORTERIA_FROM_JOIN}
       WHERE uep.id = $1`,
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

  /** Verifica si existe una empresa de seguridad con el identificador dado. */
  async empresaPorteriaExists(empresaPorteriaId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id FROM public.empresa_seguridad WHERE id = $1`,
      [empresaPorteriaId],
    );

    return rows.length > 0;
  }

  /**
   * Busca otra asignacion activa para el mismo par usuario-empresa_porteria.
   * @param usuarioId - Identificador del usuario.
   * @param empresaPorteriaId - Identificador de la empresa de seguridad.
   * @param excludeId - Identificador de asignacion a excluir de la busqueda (para updates).
   * @returns Identificador de la asignacion en conflicto, o null si no hay ninguna.
   */
  async findActiveDuplicate(usuarioId: number, excludeId?: number): Promise<number | null> {
    const params: unknown[] = [usuarioId];
    let excludeSql = "";
    if (excludeId !== undefined) {
      params.push(excludeId);
      excludeSql = `AND id <> $${params.length}`;
    }

    const rows = await this.postgres.query<{ id: string }>(
      `SELECT id
       FROM public.usuario_empresa_seguridad
       WHERE usuario_id = $1 AND activo = true
       ${excludeSql}`,
      params,
    );

    return rows[0] ? Number(rows[0].id) : null;
  }

  /** Verifica que la asignación de sede pertenezca a la empresa y esté activa y vigente. */
  async sedeAssignmentIsActive(sedeEmpresaPorteriaId: number, empresaPorteriaId: number): Promise<boolean> {
    const rows = await this.postgres.query<{ id: string }>(
      `SELECT sep.id
       FROM public.sede_empresa_seguridad sep
       INNER JOIN public.sede s ON s.id = sep.sede_id AND s.activo = true
       INNER JOIN public.empresa_seguridad ep ON ep.id = sep.empresa_seguridad_id AND ep.activo = true
       WHERE sep.id = $1
         AND sep.empresa_seguridad_id = $2
         AND sep.activo = true
         AND sep.asignado_desde <= now()
         AND (sep.asignado_hasta IS NULL OR sep.asignado_hasta >= now())`,
      [sedeEmpresaPorteriaId, empresaPorteriaId],
    );
    return rows.length > 0;
  }

  /** Inserta una nueva asignacion usuario-empresa-porteria en Postgres. */
  async create(input: CreateUsuarioEmpresaPorteriaInput): Promise<UsuarioEmpresaPorteriaRow> {
    const rows = await this.postgres.query<{ id: string }>(
      `INSERT INTO public.usuario_empresa_seguridad
         (usuario_id, empresa_seguridad_id, sede_empresa_seguridad_id, activo)
       VALUES ($1, $2, $3, $4)
       RETURNING ${USUARIO_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      [input.usuarioId, input.empresaPorteriaId, input.sedeEmpresaPorteriaId, input.activo],
    );

    const created = await this.findById(Number(rows[0].id));
    if (!created) {
      throw new Error("No se pudo recuperar la asignacion recien creada");
    }
    return created;
  }

  /** Actualiza parcialmente una asignacion usuario-empresa-porteria existente. */
  async update(id: number, input: UpdateUsuarioEmpresaPorteriaInput): Promise<UsuarioEmpresaPorteriaRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.usuarioId !== undefined) setField("usuario_id", input.usuarioId);
    if (input.empresaPorteriaId !== undefined) setField("empresa_seguridad_id", input.empresaPorteriaId);
    if (input.sedeEmpresaPorteriaId !== undefined) setField("sede_empresa_seguridad_id", input.sedeEmpresaPorteriaId);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.usuario_empresa_seguridad
       SET ${assignments.join(", ")}
       WHERE id = $${params.length}
       RETURNING ${USUARIO_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      params,
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Desactiva una asignacion usuario-empresa-porteria estableciendo `activo = false`. */
  async softDelete(id: number): Promise<UsuarioEmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.usuario_empresa_seguridad
       SET activo = false
       WHERE id = $1
       RETURNING ${USUARIO_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Reactiva una asignacion usuario-empresa-porteria estableciendo `activo = true`. */
  async activate(id: number): Promise<UsuarioEmpresaPorteriaRow | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `UPDATE public.usuario_empresa_seguridad
       SET activo = true
       WHERE id = $1
       RETURNING ${USUARIO_EMPRESA_PORTERIA_RETURNING_COLUMNS}`,
      [id],
    );

    if (!rows[0]) return null;
    return this.findById(Number(rows[0].id));
  }

  /** Elimina permanentemente una asignacion usuario-empresa-porteria de la base de datos. */
  async hardDelete(id: number): Promise<number | null> {
    const rows = await this.postgres.query<{ id: string }>(
      `DELETE FROM public.usuario_empresa_seguridad WHERE id = $1 RETURNING id`,
      [id],
    );

    const deletedId = rows[0]?.id;
    return deletedId != null ? Number(deletedId) : null;
  }

  /** Construye clausula WHERE con filtros parametrizados. */
  private buildWhereClause(filters: UsuarioEmpresaPorteriaListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = [];

    if (filters.activo !== undefined) {
      params.push(filters.activo);
      whereClauses.push(`uep.activo = $${params.length}`);
    }

    if (filters.usuarioId !== undefined) {
      params.push(filters.usuarioId);
      whereClauses.push(`uep.usuario_id = $${params.length}`);
    }

    if (filters.empresaPorteriaId !== undefined) {
      params.push(filters.empresaPorteriaId);
      whereClauses.push(`uep.empresa_seguridad_id = $${params.length}`);
    }

    if (filters.sedeId !== undefined) {
      params.push(filters.sedeId);
      whereClauses.push(`s.id = $${params.length}`);
    }

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [
        `u.nombre ILIKE $${ilikeParam}`,
        `ep.nombre ILIKE $${ilikeParam}`,
        `s.nombre ILIKE $${ilikeParam}`,
      ];

      const parsedId = Number.parseInt(search, 10);
      if (Number.isFinite(parsedId) && parsedId > 0 && String(parsedId) === search) {
        params.push(parsedId);
        searchConditions.push(`uep.id = $${params.length}`);
      }

      whereClauses.push(`(${searchConditions.join(" OR ")})`);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";
    return { whereSql, params };
  }

  /** Construye clausula ORDER BY con whitelist de columnas. */
  private buildOrderClause(filters: UsuarioEmpresaPorteriaListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY uep.id DESC";
    }

    const expression = USUARIO_EMPRESA_PORTERIA_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY uep.id DESC";
    }

    const direction: UsuarioEmpresaPorteriaSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, uep.id ASC`;
  }
}
