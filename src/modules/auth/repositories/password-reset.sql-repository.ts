/**
 * @file password-reset.sql-repository.ts
 * @description Acceso SQL para tokens de restablecimiento de contraseña y derivación de superiores.
 */
import { Injectable } from "@nestjs/common";
import { PostgresService } from "../../postgres/postgres.service";
import type { UserRole } from "../../../common/types/authenticated-user";

/** Tipo de token de restablecimiento. */
export type ResetTokenType = "propio" | "superior";

/** Token de restablecimiento vigente ya normalizado. */
export interface ResetTokenRow {
  id: number;
  usuarioId: number;
  tipo: ResetTokenType;
  superiorId: number | null;
}

/** Superior con correo, destinatario de una solicitud de reseteo. */
export interface SuperiorRecipientRow {
  id: number;
  nombre: string;
  correo: string;
}

interface ResetTokenDbRow {
  id: string | number;
  usuario_id: string | number;
  tipo: ResetTokenType;
  superior_id: string | number | null;
}

interface SuperiorRecipientDbRow {
  id: string | number;
  nombre: string;
  correo: string;
}

/** Repositorio PostgreSQL para el flujo de recuperación de contraseña. */
@Injectable()
export class PasswordResetSqlRepository {
  /** Inyecta el servicio compartido de PostgreSQL. */
  constructor(private readonly postgres: PostgresService) {}

  /** Invalida (marca como usados) los tokens pendientes del mismo tipo de un usuario. */
  async invalidatePending(usuarioId: number, tipo: ResetTokenType): Promise<void> {
    await this.postgres.query(
      `UPDATE public.usuario_restablecimiento_contrasena
       SET usado_en = now()
       WHERE usuario_id = $1 AND tipo = $2 AND usado_en IS NULL`,
      [usuarioId, tipo],
    );
  }

  /** Inserta un nuevo token de restablecimiento. */
  async createToken(input: {
    usuarioId: number;
    tipo: ResetTokenType;
    hashToken: string;
    superiorId: number | null;
    expiraEn: Date;
  }): Promise<void> {
    await this.postgres.query(
      `INSERT INTO public.usuario_restablecimiento_contrasena
         (usuario_id, tipo, hash_token, superior_id, expira_en)
       VALUES ($1, $2, $3, $4, $5)`,
      [input.usuarioId, input.tipo, input.hashToken, input.superiorId, input.expiraEn],
    );
  }

  /** Busca un token vigente (no usado y no expirado) por su hash. */
  async findValidByHash(hashToken: string): Promise<ResetTokenRow | null> {
    const rows = await this.postgres.query<ResetTokenDbRow>(
      `SELECT id, usuario_id, tipo, superior_id
       FROM public.usuario_restablecimiento_contrasena
       WHERE hash_token = $1
         AND usado_en IS NULL
         AND expira_en > now()
       ORDER BY id DESC
       LIMIT 1`,
      [hashToken],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: Number(row.id),
      usuarioId: Number(row.usuario_id),
      tipo: row.tipo,
      superiorId: row.superior_id == null ? null : Number(row.superior_id),
    };
  }

  /** Marca un token como usado. */
  async markUsed(id: number): Promise<void> {
    await this.postgres.query(
      `UPDATE public.usuario_restablecimiento_contrasena
       SET usado_en = now()
       WHERE id = $1`,
      [id],
    );
  }

  /** Actualiza la contraseña y la bandera de cambio forzado de un usuario. */
  async setPassword(usuarioId: number, contrasenaHash: string, requiereCambio: boolean): Promise<void> {
    await this.postgres.query(
      `UPDATE public.usuario
       SET contrasena_hash = $1,
           requiere_cambio_contrasena = $2,
           actualizado_en = now()
       WHERE id = $3 AND id <> 0`,
      [contrasenaHash, requiereCambio, usuarioId],
    );
  }

  /**
   * Busca superiores activos con correo que puedan resetear a un subordinado, según el rol superior
   * y el ámbito (empresa de seguridad y/o sede) del subordinado.
   * @param role - Rol del superior candidato.
   * @param empresaSeguridadId - Empresa de seguridad del subordinado (para roles de seguridad).
   * @param sedeId - Sede del subordinado (para roles de sede).
   * @returns Superiores con correo, sin duplicados.
   */
  async findEmailSuperiors(
    role: UserRole,
    empresaSeguridadId: number | null,
    sedeId: number | null,
  ): Promise<SuperiorRecipientRow[]> {
    let sql: string;
    let params: unknown[];

    if (role === "super_admin") {
      sql = `SELECT u.id, u.nombre, u.correo
             FROM public.usuario u
             WHERE u.activo = true AND u.correo IS NOT NULL AND u.id <> 0
               AND u.rol = 'super_admin'`;
      params = [];
    } else if (role === "encargado_seguridad") {
      if (empresaSeguridadId == null) return [];
      sql = `SELECT DISTINCT u.id, u.nombre, u.correo
             FROM public.usuario u
             JOIN public.usuario_empresa_seguridad uep ON uep.usuario_id = u.id AND uep.activo = true
             WHERE u.activo = true AND u.correo IS NOT NULL
               AND u.rol = 'encargado_seguridad'
               AND uep.empresa_seguridad_id = $1`;
      params = [empresaSeguridadId];
    } else if (role === "encargado_porteria") {
      if (empresaSeguridadId == null || sedeId == null) return [];
      sql = `SELECT DISTINCT u.id, u.nombre, u.correo
             FROM public.usuario u
             JOIN public.usuario_empresa_seguridad uep ON uep.usuario_id = u.id AND uep.activo = true
             JOIN public.sede_empresa_seguridad sep ON sep.id = uep.sede_empresa_seguridad_id AND sep.activo = true
             WHERE u.activo = true AND u.correo IS NOT NULL
               AND u.rol = 'encargado_porteria'
               AND uep.empresa_seguridad_id = $1
               AND sep.sede_id = $2`;
      params = [empresaSeguridadId, sedeId];
    } else if (role === "admin_empresa") {
      if (sedeId == null) return [];
      sql = `SELECT DISTINCT u.id, u.nombre, u.correo
             FROM public.usuario u
             JOIN public.usuario_sede us ON us.usuario_id = u.id AND us.activo = true
             WHERE u.activo = true AND u.correo IS NOT NULL
               AND u.rol = 'admin_empresa'
               AND us.sede_id = $1`;
      params = [sedeId];
    } else {
      return [];
    }

    const rows = await this.postgres.query<SuperiorRecipientDbRow>(sql, params);
    return rows.map((row) => ({ id: Number(row.id), nombre: row.nombre, correo: row.correo }));
  }
}
