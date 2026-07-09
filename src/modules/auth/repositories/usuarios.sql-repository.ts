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

const VALID_USER_ROLES = new Set<UserRole>(["super_admin", "admin_empresa", "portero"]);

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
