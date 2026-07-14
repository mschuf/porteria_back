/**
 * @file usuarios.sql-repository.ts
 * @description Acceso SQL a la tabla `public.usuario` para autenticación local.
 */
import { Injectable } from "@nestjs/common";
import { PostgresService } from "../../postgres/postgres.service";
import type { UserRole } from "../../../common/types/authenticated-user";

/** Fila normalizada de `public.usuario` usada por autenticación. */
export interface UsuarioAuthRow {
  id: number;
  usuario: string;
  contrasenaHash: string;
  nombre: string;
  correo: string | null;
  rol: UserRole;
}

interface UsuarioDbRow {
  id: string | number;
  usuario: string;
  contrasena_hash: string;
  nombre: string;
  correo: string | null;
  rol: string;
}

export interface PorteriaAssignmentRow {
  sedeId: number | null;
  sedeName: string | null;
  empresaId: number | null;
  empresaName: string | null;
  empresaSeguridadId: number;
  empresaPorteriaName: string;
}

interface PorteriaAssignmentDbRow {
  sede_id: string | number | null;
  sede_nombre: string | null;
  empresa_id: string | number | null;
  empresa_nombre: string | null;
  empresa_seguridad_id: string | number;
  empresa_porteria_nombre: string;
}

const VALID_USER_ROLES = new Set<UserRole>([
  "super_admin", "admin_empresa", "encargado_seguridad", "encargado_porteria", "portero",
]);

/** Repositorio PostgreSQL para usuarios internos del sistema. */
@Injectable()
export class UsuariosSqlRepository {
  /** Inyecta el servicio compartido de PostgreSQL. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Busca un usuario activo por login exacto.
   * @param usuario - Nombre de usuario normalizado.
   * @returns Usuario activo o `null`.
   */
  async findActiveByUsuario(usuario: string): Promise<UsuarioAuthRow | null> {
    const rows = await this.postgres.query<UsuarioDbRow>(
      `SELECT id, usuario, contrasena_hash, nombre, correo, rol
       FROM public.usuario
       WHERE usuario = $1
         AND activo = true
       LIMIT 1`,
      [usuario],
    );

    return rows[0] ? this.toAuthRow(rows[0]) : null;
  }

  /**
   * Lista usuarios activos ordenados por nombre.
   * @returns Usuarios activos del sistema local.
   */
  async listActive(): Promise<UsuarioAuthRow[]> {
    const rows = await this.postgres.query<UsuarioDbRow>(
      `SELECT id, usuario, contrasena_hash, nombre, correo, rol
       FROM public.usuario
       WHERE activo = true
         AND id <> 0
       ORDER BY nombre ASC, usuario ASC`,
    );

    return rows.map((row) => this.toAuthRow(row));
  }

  /**
   * Busca un usuario activo por ID.
   * @param id - Identificador de usuario.
   * @returns Usuario activo o `null`.
   */
  async findActiveById(id: number): Promise<UsuarioAuthRow | null> {
    const rows = await this.postgres.query<UsuarioDbRow>(
      `SELECT id, usuario, contrasena_hash, nombre, correo, rol
       FROM public.usuario
       WHERE id = $1
         AND activo = true
       LIMIT 1`,
      [id],
    );

    return rows[0] ? this.toAuthRow(rows[0]) : null;
  }

  /**
   * Busca un usuario activo por correo electrónico normalizado.
   * @param correo - Correo electrónico.
   * @returns Usuario activo o `null`.
   */
  async findActiveByCorreo(correo: string): Promise<UsuarioAuthRow | null> {
    const rows = await this.postgres.query<UsuarioDbRow>(
      `SELECT id, usuario, contrasena_hash, nombre, correo, rol
       FROM public.usuario
       WHERE lower(correo) = lower($1)
         AND activo = true
       LIMIT 1`,
      [correo],
    );

    return rows[0] ? this.toAuthRow(rows[0]) : null;
  }

  /**
   * Registra el último acceso exitoso.
   * @param id - Identificador de usuario.
   * @returns Promesa resuelta al completar el update.
   */
  async updateUltimoAcceso(id: number): Promise<void> {
    await this.postgres.query(
      `UPDATE public.usuario
       SET ultimo_acceso_en = now(),
           actualizado_en = now()
       WHERE id = $1`,
      [id],
    );
  }

  /** Resuelve la única sede activa y vigente asignada a un portero. */
  async findActivePorteriaAssignment(userId: number): Promise<PorteriaAssignmentRow | null> {
    const rows = await this.postgres.query<PorteriaAssignmentDbRow>(
      `SELECT
          ep.id AS empresa_seguridad_id,
          s.id AS sede_id,
          s.nombre AS sede_nombre,
          e.id AS empresa_id,
          e.nombre AS empresa_nombre,
          ep.nombre AS empresa_porteria_nombre
       FROM public.usuario_empresa_seguridad uep
       INNER JOIN public.usuario u ON u.id = uep.usuario_id AND u.activo = true
       LEFT JOIN public.sede_empresa_seguridad sep
         ON sep.id = uep.sede_empresa_seguridad_id
        AND sep.empresa_seguridad_id = uep.empresa_seguridad_id
       LEFT JOIN public.sede s ON s.id = sep.sede_id
       LEFT JOIN public.empresa e ON e.id = s.empresa_id
       INNER JOIN public.empresa_seguridad ep ON ep.id = uep.empresa_seguridad_id
       WHERE uep.usuario_id = $1
         AND uep.activo = true
         AND ep.activo = true
         AND (
           (u.rol = 'encargado_seguridad' AND uep.sede_empresa_seguridad_id IS NULL)
           OR (u.rol IN ('portero', 'encargado_porteria')
             AND sep.activo = true AND s.activo = true AND e.activo = true
             AND sep.asignado_desde <= now()
             AND (sep.asignado_hasta IS NULL OR sep.asignado_hasta >= now()))
         )
       LIMIT 2`,
      [userId],
    );

    if (rows.length !== 1) return null;
    const row = rows[0]!;
    return {
      sedeId: row.sede_id == null ? null : Number(row.sede_id),
      sedeName: row.sede_nombre,
      empresaId: row.empresa_id == null ? null : Number(row.empresa_id),
      empresaName: row.empresa_nombre,
      empresaSeguridadId: Number(row.empresa_seguridad_id),
      empresaPorteriaName: row.empresa_porteria_nombre,
    };
  }

  private toAuthRow(row: UsuarioDbRow): UsuarioAuthRow {
    const role = row.rol as UserRole;
    if (!VALID_USER_ROLES.has(role)) {
      throw new Error(`Invalid usuario.rol '${row.rol}' for user '${row.usuario}'`);
    }

    return {
      id: Number(row.id),
      usuario: row.usuario,
      contrasenaHash: row.contrasena_hash,
      nombre: row.nombre,
      correo: row.correo,
      rol: role,
    };
  }
}
