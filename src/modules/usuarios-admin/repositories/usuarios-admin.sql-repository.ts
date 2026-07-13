/**
 * @file usuarios-admin.sql-repository.ts
 * @description Acceso SQL de administracion a la tabla `public.usuario` con paginacion, filtros y orden.
 */
import { Injectable } from "@nestjs/common";
import type { PaginatedResult } from "../../../common/dto/pagination.dto";
import { PostgresService } from "../../postgres/postgres.service";
import type {
  CreateUsuarioAdminInput,
  UsuarioAdminEmpresaAssignmentRow,
  UsuarioAdminListFilters,
  UsuarioAdminPorteriaAssignmentRow,
  UsuarioAdminRow,
  UpdateUsuarioAdminInput,
} from "../usuarios-admin.types";
import type { UsuarioAdminSortBy, UsuarioAdminSortOrder } from "../dto/list-usuarios-admin-query.dto";

const USUARIO_ADMIN_SORT_EXPRESSIONS: Record<UsuarioAdminSortBy, string> = {
  id: "id",
  usuario: "usuario",
  nombre: "nombre",
  correo: "correo",
  rol: "rol",
  createdAt: "creado_en",
};

const USUARIO_ADMIN_SELECT_COLUMNS = `
  id,
  usuario,
  nombre,
  correo,
  rol,
  activo,
  creado_en,
  actualizado_en
`;

/** Repositorio Postgres para operaciones CRUD administrativas sobre usuarios. */
@Injectable()
export class UsuariosAdminSqlRepository {
  /** Inyecta el servicio de Postgres. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Lista usuarios paginados aplicando filtros y orden. Excluye el usuario reservado id=0.
   * @param filters - Paginacion, busqueda y filtros por columna.
   * @returns Filas paginadas y metadatos de paginacion.
   */
  async findAll(filters: UsuarioAdminListFilters): Promise<PaginatedResult<UsuarioAdminRow>> {
    const { whereSql, params } = this.buildWhereClause(filters);
    const countRows = await this.postgres.query<{ total: string }>(
      `SELECT COUNT(*)::text AS total FROM public.usuario ${whereSql}`,
      params,
    );
    const total = Number(countRows[0]?.total ?? 0);
    const offset = (filters.page - 1) * filters.limit;
    const orderSql = this.buildOrderClause(filters);

    const listParams = [...params, filters.limit, offset];
    const limitParam = listParams.length - 1;
    const offsetParam = listParams.length;

    const items = await this.postgres.query<UsuarioAdminRow>(
      `SELECT ${USUARIO_ADMIN_SELECT_COLUMNS}
       FROM public.usuario
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

  /** Busca un usuario por identificador (excluye el usuario reservado id=0). */
  async findById(id: number): Promise<UsuarioAdminRow | null> {
    const rows = await this.postgres.query<UsuarioAdminRow>(
      `SELECT ${USUARIO_ADMIN_SELECT_COLUMNS}
       FROM public.usuario
       WHERE id = $1 AND id <> 0`,
      [id],
    );

    return rows[0] ?? null;
  }

  /** Busca un usuario por login exacto. */
  async findByUsuario(usuario: string): Promise<UsuarioAdminRow | null> {
    const rows = await this.postgres.query<UsuarioAdminRow>(
      `SELECT ${USUARIO_ADMIN_SELECT_COLUMNS}
       FROM public.usuario
       WHERE usuario = $1 AND id <> 0`,
      [usuario],
    );

    return rows[0] ?? null;
  }

  /** Lista las empresas receptoras activas asignadas activamente a un usuario. */
  async findActiveEmpresaAssignments(usuarioId: number): Promise<UsuarioAdminEmpresaAssignmentRow[]> {
    return this.postgres.query<UsuarioAdminEmpresaAssignmentRow>(
      `SELECT
         e.id AS empresa_id,
         e.nombre AS empresa_nombre
       FROM public.usuario_empresa ue
       INNER JOIN public.empresa e ON e.id = ue.empresa_id AND e.activo = true
       WHERE ue.usuario_id = $1
         AND ue.activo = true
       ORDER BY e.nombre ASC, e.id ASC`,
      [usuarioId],
    );
  }

  /** Obtiene la cadena activa y vigente que determina el acceso de un portero. */
  async findActivePorteriaAssignment(usuarioId: number): Promise<UsuarioAdminPorteriaAssignmentRow | null> {
    const rows = await this.postgres.query<UsuarioAdminPorteriaAssignmentRow>(
      `SELECT
         ep.id AS empresa_porteria_id,
         ep.nombre AS empresa_porteria_nombre,
         s.id AS sede_id,
         s.nombre AS sede_nombre,
         e.id AS empresa_id,
         e.nombre AS empresa_nombre
       FROM public.usuario_empresa_porteria uep
       INNER JOIN public.sede_empresa_porteria sep
         ON sep.id = uep.sede_empresa_porteria_id
        AND sep.empresa_porteria_id = uep.empresa_porteria_id
       INNER JOIN public.empresa_porteria ep
         ON ep.id = sep.empresa_porteria_id
        AND ep.activo = true
       INNER JOIN public.sede s ON s.id = sep.sede_id AND s.activo = true
       INNER JOIN public.empresa e ON e.id = s.empresa_id AND e.activo = true
       WHERE uep.usuario_id = $1
         AND uep.activo = true
         AND sep.activo = true
         AND sep.asignado_desde <= now()
         AND (sep.asignado_hasta IS NULL OR sep.asignado_hasta >= now())
       ORDER BY uep.id ASC
       LIMIT 2`,
      [usuarioId],
    );

    return rows.length === 1 ? rows[0] : null;
  }

  /** Inserta un nuevo usuario en Postgres con contraseña ya hasheada. */
  async create(input: CreateUsuarioAdminInput): Promise<UsuarioAdminRow> {
    const rows = await this.postgres.query<UsuarioAdminRow>(
      `INSERT INTO public.usuario (usuario, nombre, correo, rol, activo, contrasena_hash)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING ${USUARIO_ADMIN_SELECT_COLUMNS}`,
      [input.usuario, input.nombre, input.correo, input.rol, input.activo, input.contrasenaHash],
    );

    return rows[0];
  }

  /** Actualiza parcialmente un usuario existente (excluye el usuario reservado id=0). */
  async update(id: number, input: UpdateUsuarioAdminInput): Promise<UsuarioAdminRow | null> {
    const assignments: string[] = [];
    const params: unknown[] = [];

    const setField = (column: string, value: unknown): void => {
      params.push(value);
      assignments.push(`${column} = $${params.length}`);
    };

    if (input.usuario !== undefined) setField("usuario", input.usuario);
    if (input.nombre !== undefined) setField("nombre", input.nombre);
    if (input.correo !== undefined) setField("correo", input.correo);
    if (input.rol !== undefined) setField("rol", input.rol);
    if (input.activo !== undefined) setField("activo", input.activo);

    if (assignments.length === 0) {
      return this.findById(id);
    }

    params.push(id);

    const rows = await this.postgres.query<UsuarioAdminRow>(
      `UPDATE public.usuario
       SET ${assignments.join(", ")}
       WHERE id = $${params.length} AND id <> 0
       RETURNING ${USUARIO_ADMIN_SELECT_COLUMNS}`,
      params,
    );

    return rows[0] ?? null;
  }

  /** Actualiza la contraseña hasheada de un usuario existente. */
  async updatePassword(id: number, contrasenaHash: string): Promise<UsuarioAdminRow | null> {
    const rows = await this.postgres.query<UsuarioAdminRow>(
      `UPDATE public.usuario
       SET contrasena_hash = $1
       WHERE id = $2 AND id <> 0
       RETURNING ${USUARIO_ADMIN_SELECT_COLUMNS}`,
      [contrasenaHash, id],
    );

    return rows[0] ?? null;
  }

  /** Activa o desactiva un usuario (excluye el usuario reservado id=0). */
  async setActivo(id: number, activo: boolean): Promise<UsuarioAdminRow | null> {
    const rows = await this.postgres.query<UsuarioAdminRow>(
      `UPDATE public.usuario
       SET activo = $1
       WHERE id = $2 AND id <> 0
       RETURNING ${USUARIO_ADMIN_SELECT_COLUMNS}`,
      [activo, id],
    );

    return rows[0] ?? null;
  }

  /** Construye clausula WHERE con filtros parametrizados, excluyendo el usuario reservado id=0. */
  private buildWhereClause(filters: UsuarioAdminListFilters): { whereSql: string; params: unknown[] } {
    const params: unknown[] = [];
    const whereClauses: string[] = ["id <> 0"];

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

    if (filters.rol !== undefined) {
      params.push(filters.rol);
      whereClauses.push(`rol = $${params.length}`);
    }

    addIlike("usuario", filters.usuario);
    addIlike("nombre", filters.nombre);
    addIlike("correo", filters.correo);

    const search = filters.search?.trim();
    if (search) {
      params.push(`%${search}%`);
      const ilikeParam = params.length;
      const searchConditions = [
        `usuario ILIKE $${ilikeParam}`,
        `nombre ILIKE $${ilikeParam}`,
        `correo ILIKE $${ilikeParam}`,
      ];

      const parsedId = Number.parseInt(search, 10);
      if (Number.isFinite(parsedId) && parsedId > 0 && String(parsedId) === search) {
        params.push(parsedId);
        searchConditions.push(`id = $${params.length}`);
      }

      whereClauses.push(`(${searchConditions.join(" OR ")})`);
    }

    const whereSql = `WHERE ${whereClauses.join(" AND ")}`;
    return { whereSql, params };
  }

  /** Construye clausula ORDER BY con whitelist de columnas. */
  private buildOrderClause(filters: UsuarioAdminListFilters): string {
    if (!filters.sortBy) {
      return "ORDER BY id DESC";
    }

    const expression = USUARIO_ADMIN_SORT_EXPRESSIONS[filters.sortBy];
    if (!expression) {
      return "ORDER BY id DESC";
    }

    const direction: UsuarioAdminSortOrder = filters.sortOrder === "desc" ? "desc" : "asc";
    return `ORDER BY ${expression} ${direction.toUpperCase()} NULLS LAST, id ASC`;
  }
}
