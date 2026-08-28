/**
 * @file login-throttle.service.ts
 * @description Bloqueo anti fuerza bruta del login por usuario e IP, persistido en PostgreSQL.
 */
import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { BusinessException } from "../../common/exceptions/business.exception";
import { API_ERROR_CODE } from "../../common/types/api-error-code";
import { LoginIntentoSqlRepository } from "./repositories/login-intento.sql-repository";

/** Fallos permitidos por nombre de usuario en la ventana. */
export const LOGIN_MAX_ATTEMPTS_USER = 20;

/** Fallos permitidos por IP en la ventana (más alto para oficinas detrás de NAT). */
export const LOGIN_MAX_ATTEMPTS_IP = 40;

/** Duración de la ventana de conteo y del bloqueo, en minutos. */
export const LOGIN_WINDOW_MINUTES = 15;

/** A partir de este remaining se incluye `details.remainingAttempts` en el 401. */
export const LOGIN_REMAINING_WARN_AT = 5;

/** Servicio de umbrales y claves de bloqueo de login. */
@Injectable()
export class LoginThrottleService {
  private readonly logger = new Logger(LoginThrottleService.name);

  /** Inyecta el repositorio de contadores de login. */
  constructor(private readonly loginIntentos: LoginIntentoSqlRepository) {}

  /**
   * Rechaza el login si el usuario o la IP tienen un bloqueo vigente.
   * @param username - Nombre de usuario ingresado.
   * @param clientIp - IP del cliente (`req.ip`).
   * @returns void
   * @throws {BusinessException} 429 / `RATE_LIMITED` si hay bloqueo vigente.
   */
  async assertAllowed(username: string, clientIp: string): Promise<void> {
    const lockedKey = await this.loginIntentos.findActiveLock([
      this.userKey(username),
      this.ipKey(clientIp),
    ]);
    if (!lockedKey) return;

    this.logger.warn(`[AUTH] Login locked (${lockedKey}) for '${username.trim()}'`);
    throw new BusinessException({
      message: "Demasiados intentos fallidos. Intente de nuevo en 15 minutos.",
      code: API_ERROR_CODE.RATE_LIMITED,
      status: HttpStatus.TOO_MANY_REQUESTS,
    });
  }

  /**
   * Registra un fallo de login en las claves de usuario e IP.
   * @param username - Nombre de usuario ingresado.
   * @param clientIp - IP del cliente.
   * @returns Intentos restantes del usuario (`20 - intentos`, mínimo 0).
   */
  async recordFailure(username: string, clientIp: string): Promise<number> {
    const userRecord = await this.loginIntentos.recordFailure(
      this.userKey(username),
      LOGIN_MAX_ATTEMPTS_USER,
      LOGIN_WINDOW_MINUTES,
    );
    await this.loginIntentos.recordFailure(
      this.ipKey(clientIp),
      LOGIN_MAX_ATTEMPTS_IP,
      LOGIN_WINDOW_MINUTES,
    );

    return Math.max(0, LOGIN_MAX_ATTEMPTS_USER - userRecord.intentos);
  }

  /**
   * Borra el contador del usuario tras un login con contraseña válida.
   * @param username - Nombre de usuario autenticado.
   * @returns void
   */
  async clear(username: string): Promise<void> {
    await this.loginIntentos.clear(this.userKey(username));
  }

  /**
   * Normaliza la clave de usuario.
   * @param username - Nombre de usuario ingresado.
   * @returns Clave `u:{username}`.
   */
  userKey(username: string): string {
    return `u:${username.trim().toLowerCase()}`;
  }

  /**
   * Normaliza la clave de IP.
   * @param clientIp - IP del cliente.
   * @returns Clave `ip:{ip}`.
   */
  ipKey(clientIp: string): string {
    const ip = clientIp.trim() || "unknown";
    return `ip:${ip}`;
  }
}
