/**
 * @file login-intento.sql-repository.ts
 * @description Acceso SQL a `public.login_intento` para el bloqueo anti fuerza bruta del login.
 */
import { Injectable } from "@nestjs/common";
import { PostgresService } from "../../postgres/postgres.service";

/** Resultado de registrar un fallo de login sobre una clave. */
export interface LoginIntentoRecord {
  intentos: number;
  bloqueadoHasta: Date | null;
}

interface LoginIntentoDbRow {
  intentos: string | number;
  bloqueado_hasta: Date | string | null;
}

interface LoginLockDbRow {
  clave: string;
}

/** Repositorio PostgreSQL de contadores de login fallido. */
@Injectable()
export class LoginIntentoSqlRepository {
  /** Inyecta el servicio compartido de PostgreSQL. */
  constructor(private readonly postgres: PostgresService) {}

  /**
   * Devuelve la primera clave con bloqueo vigente, si existe.
   * @param claves - Claves `u:` / `ip:` a consultar.
   * @returns Clave bloqueada o `null`.
   */
  async findActiveLock(claves: string[]): Promise<string | null> {
    if (claves.length === 0) return null;

    const rows = await this.postgres.query<LoginLockDbRow>(
      `SELECT clave
       FROM public.login_intento
       WHERE clave = ANY($1::text[])
         AND bloqueado_hasta IS NOT NULL
         AND bloqueado_hasta > now()
       LIMIT 1`,
      [claves],
    );

    return rows[0]?.clave ?? null;
  }

  /**
   * Incrementa el contador de una clave de forma atómica. Si la ventana expiró y no hay
   * bloqueo vigente, reinicia el contador. Al alcanzar `maxIntentos` setea `bloqueado_hasta`.
   * @param clave - Clave `u:{usuario}` o `ip:{ip}`.
   * @param maxIntentos - Umbral que dispara el bloqueo.
   * @param ventanaMinutos - Duración de la ventana y del bloqueo, en minutos.
   * @returns Intentos actuales y fin del bloqueo (si aplica).
   */
  async recordFailure(
    clave: string,
    maxIntentos: number,
    ventanaMinutos: number,
  ): Promise<LoginIntentoRecord> {
    const rows = await this.postgres.query<LoginIntentoDbRow>(
      `INSERT INTO public.login_intento (
         clave, intentos, ventana_inicia_en, bloqueado_hasta, actualizado_en
       )
       VALUES (
         $1,
         1,
         now(),
         CASE WHEN 1 >= $2 THEN now() + ($3::int * INTERVAL '1 minute') ELSE NULL END,
         now()
       )
       ON CONFLICT (clave) DO UPDATE SET
         intentos = CASE
           WHEN login_intento.bloqueado_hasta IS NOT NULL
             AND login_intento.bloqueado_hasta > now()
             THEN login_intento.intentos
           WHEN (login_intento.bloqueado_hasta IS NOT NULL
             AND login_intento.bloqueado_hasta <= now())
             OR (now() - login_intento.ventana_inicia_en > ($3::int * INTERVAL '1 minute'))
             THEN 1
           ELSE login_intento.intentos + 1
         END,
         ventana_inicia_en = CASE
           WHEN login_intento.bloqueado_hasta IS NOT NULL
             AND login_intento.bloqueado_hasta > now()
             THEN login_intento.ventana_inicia_en
           WHEN (login_intento.bloqueado_hasta IS NOT NULL
             AND login_intento.bloqueado_hasta <= now())
             OR (now() - login_intento.ventana_inicia_en > ($3::int * INTERVAL '1 minute'))
             THEN now()
           ELSE login_intento.ventana_inicia_en
         END,
         bloqueado_hasta = CASE
           WHEN login_intento.bloqueado_hasta IS NOT NULL
             AND login_intento.bloqueado_hasta > now()
             THEN login_intento.bloqueado_hasta
           WHEN (
             CASE
               WHEN (login_intento.bloqueado_hasta IS NOT NULL
                 AND login_intento.bloqueado_hasta <= now())
                 OR (now() - login_intento.ventana_inicia_en > ($3::int * INTERVAL '1 minute'))
                 THEN 1
               ELSE login_intento.intentos + 1
             END
           ) >= $2
             THEN now() + ($3::int * INTERVAL '1 minute')
           ELSE NULL
         END,
         actualizado_en = now()
       RETURNING intentos, bloqueado_hasta`,
      [clave, maxIntentos, ventanaMinutos],
    );

    const row = rows[0];
    if (!row) {
      return { intentos: 1, bloqueadoHasta: null };
    }

    return {
      intentos: Number(row.intentos),
      bloqueadoHasta: row.bloqueado_hasta ? new Date(row.bloqueado_hasta) : null,
    };
  }

  /**
   * Elimina el contador de una clave (login exitoso del usuario).
   * @param clave - Clave a borrar, normalmente `u:{usuario}`.
   * @returns void
   */
  async clear(clave: string): Promise<void> {
    await this.postgres.query(`DELETE FROM public.login_intento WHERE clave = $1`, [clave]);
  }
}
